import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import type { RackRow } from '../domain/types';
import { useStore } from '../state/store';
import { useBoxInstances, type BoxInstance } from './instancing';
import { Label } from './Label';
import { SCENE } from './palette';
import { specPlateTexture, stripTexture } from './textures';
import { beamMaps, connectorMap, uprightMaps } from './pbr';
import * as THREE_ from 'three';

const unitBox = new THREE_.BoxGeometry(1, 1, 1);

/** Barra entre dos puntos (diagonales del bastidor). */
interface BraceInstance {
  a: [number, number, number];
  b: [number, number, number];
}

const _m = new THREE_.Matrix4();
const _q = new THREE_.Quaternion();
const _p = new THREE_.Vector3();
const _s = new THREE_.Vector3();
const _d = new THREE_.Vector3();
const _x = new THREE_.Vector3(0, 1, 0);

function useBraceInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: BraceInstance[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      _d.set(it.b[0] - it.a[0], it.b[1] - it.a[1], it.b[2] - it.a[2]);
      const len = _d.length();
      _q.setFromUnitVectors(_x, _d.normalize());
      _p.set((it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, (it.a[2] + it.b[2]) / 2);
      _m.compose(_p, _q, _s.set(0.035, len, 0.035));
      mesh.setMatrixAt(i, _m);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, items]);
}

/** Texturas de pintura industrial (compartidas por todas las filas). */
function rackMaterials() {
  if (!rackMatCache.upright) {
    const upright = uprightMaps().map.clone();
    // Todas las filas tienen la misma altura de parante: la perforación repite cada 0,6 m.
    upright.repeat.set(1, ((layout.levels - 1) * layout.rack.levelHeight) / 0.6);
    upright.needsUpdate = true;
    rackMatCache.upright = upright;
  }
  return { upright: rackMatCache.upright, beam: beamMaps().map, plate: connectorMap() };
}
const rackMatCache: { upright?: THREE.Texture } = {};

/** Píxeles de movimiento a partir de los cuales un clic se considera arrastre. */
export const DRAG_PX = 5;
const noRaycast = () => null;

export function Racks() {
  const rows = useStore((s) => s.warehouse.rows);
  return (
    <group>
      {rows.map((r) => (
        <RackFrame key={r.id} row={r} />
      ))}
    </group>
  );
}

const RackFrame = memo(function RackFrame({ row }: { row: RackRow }) {
  const dim = layout.rack;
  const selected = useStore((s) => s.selection?.kind === 'row' && s.selection.id === row.id);
  const hovered = useStore((s) => s.hover?.kind === 'row' && s.hover.id === row.id);
  const showLabels = useStore((s) => s.showLabels);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const clearHover = useStore((s) => s.clearHover);

  // Los parantes llegan hasta la mitad del pallet del último nivel (arriba no hay más larguero).
  const beamLevels = layout.levels - 1;
  const top = beamLevels * dim.levelHeight + 0.55;
  const length = row.x1 - row.x0;
  const us = dim.uprightSize;
  const frontZ = row.facing === 1 ? row.z1 : row.z0;

  const { uprights, braces, beams, plates } = useMemo(() => {
    const uprights: BoxInstance[] = [];
    const braces: BraceInstance[] = [];
    const beams: BoxInstance[] = [];
    const plates: BoxInstance[] = [];
    const uh = top;
    const za = row.z0 + us / 2;
    const zb = row.z1 - us / 2;
    for (const x of row.uprightsX) {
      for (const z of [za, zb]) uprights.push({ position: [x, uh / 2, z], scale: [us, uh, us] });
      // Bastidor: travesaños abajo y arriba, diagonales en zigzag entre medio (como la foto).
      for (const y of [0.15, uh - 0.15]) braces.push({ a: [x, y, za], b: [x, y, zb] });
      const n = 5;
      const y0 = 0.15;
      const step = (uh - 0.3) / n;
      for (let i = 0; i < n; i++) {
        const ya = y0 + i * step;
        const yb = ya + step;
        braces.push(i % 2 === 0 ? { a: [x, ya, za], b: [x, yb, zb] } : { a: [x, ya, zb], b: [x, yb, za] });
      }
    }
    // Largueros por módulo (entre parantes), con su placa de conexión en cada punta.
    for (let k = 1; k <= beamLevels; k++) {
      const y = k * dim.levelHeight;
      for (let i = 0; i + 1 < row.uprightsX.length; i++) {
        const xa = row.uprightsX[i] + us / 2;
        const xb = row.uprightsX[i + 1] - us / 2;
        for (const z of [row.z0 + us / 2, row.z1 - us / 2]) {
          const face = z < (row.z0 + row.z1) / 2 ? -1 : 1;
          beams.push({ position: [(xa + xb) / 2, y, z + face * 0.005], scale: [xb - xa - 0.1, dim.beamHeight, 0.05] });
          for (const xe of [xa + 0.04, xb - 0.04])
            plates.push({ position: [xe, y - 0.02, z + face * 0.03], scale: [0.08, 0.17, 0.012] });
        }
      }
    }
    return { uprights, braces, beams, plates };
  }, [row, top, us, dim, beamLevels]);

  const uRef = useRef<THREE.InstancedMesh>(null);
  const brRef = useRef<THREE.InstancedMesh>(null);
  const bRef = useRef<THREE.InstancedMesh>(null);
  const pRef = useRef<THREE.InstancedMesh>(null);
  useBoxInstances(uRef, uprights);
  useBraceInstances(brRef, braces);
  useBoxInstances(bRef, beams);
  useBoxInstances(pRef, plates);
  const mats = rackMaterials();

  const frameColor = selected ? SCENE.frameSelected : hovered ? SCENE.frameHover : SCENE.upright;
  const beamColor = selected ? SCENE.frameSelected : SCENE.beam;
  const h = { kind: 'row' as const, id: row.id };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > DRAG_PX) return;
    select({ kind: 'row', id: row.id });
  };

  // Tira con los números de módulo, mirando al pasillo.
  const strip = useMemo(() => {
    const items = Array.from({ length: row.modules }, (_, i) => {
      const m = i + 1;
      const x = row.locations[(m - 1) * layout.levels].position[0];
      const t = row.facing === 1 ? (x - row.x0) / length : (row.x1 - x) / length;
      return { t, text: `${row.id}${m}` };
    });
    return stripTexture(`${row.id}-${row.facing}`, items, Math.round(length * 60), 48);
  }, [row, length]);

  return (
    <group>
      <group
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(h);
        }}
        onPointerOut={() => clearHover(h)}
      >
        <instancedMesh ref={uRef} args={[unitBox, undefined, uprights.length]} castShadow receiveShadow>
          <meshPhysicalMaterial color={frameColor} map={mats.upright} metalness={0.45} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} />
        </instancedMesh>
        <instancedMesh ref={brRef} args={[unitBox, undefined, braces.length]} castShadow receiveShadow>
          <meshStandardMaterial color={frameColor} metalness={0.45} roughness={0.45} />
        </instancedMesh>
        <instancedMesh ref={bRef} args={[unitBox, undefined, beams.length]} castShadow receiveShadow>
          <meshPhysicalMaterial color={beamColor} map={mats.beam} metalness={0.3} roughness={0.38} clearcoat={0.5} clearcoatRoughness={0.3} />
        </instancedMesh>
        <instancedMesh ref={pRef} args={[unitBox, undefined, plates.length]} castShadow raycast={noRaycast}>
          <meshStandardMaterial color={beamColor} map={mats.plate} metalness={0.35} roughness={0.4} />
        </instancedMesh>
      </group>

      {/* Protectores rojos en las cabeceras */}
      {[row.x0 - 0.08, row.x1 + 0.08].map((x) => (
        <mesh key={x} position={[x, 0.2, (row.z0 + row.z1) / 2]} raycast={noRaycast}>
          <boxGeometry args={[0.1, 0.4, dim.depth + 0.12]} />
          <meshStandardMaterial color={SCENE.guard} roughness={0.5} />
        </mesh>
      ))}

      {/* Chapa de características (Mecalux) en ambas cabeceras */}
      {[
        { x: row.x1 + 0.055, rot: Math.PI / 2 },
        { x: row.x0 - 0.055, rot: -Math.PI / 2 },
      ].map((p) => (
        <group key={p.x} position={[p.x, 1.55, (row.z0 + row.z1) / 2]} rotation={[0, p.rot, 0]}>
          <mesh raycast={noRaycast}>
            <planeGeometry args={[0.42, 0.3]} />
            <meshBasicMaterial map={specPlateTexture()} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Letra de la fila en ambas cabeceras */}
      <Label
        text={row.id}
        position={[row.x1 + 0.06, top + 0.6, (row.z0 + row.z1) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        height={0.85}
        background="#ffffff"
      />
      <Label
        text={row.id}
        position={[row.x0 - 0.06, top + 0.6, (row.z0 + row.z1) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        height={0.85}
        background="#ffffff"
      />

      {showLabels && (
        <>
          <mesh
            position={[(row.x0 + row.x1) / 2, beamLevels * dim.levelHeight + 0.2, frontZ + row.facing * 0.03]}
            rotation={[0, row.facing === 1 ? 0 : Math.PI, 0]}
            raycast={noRaycast}
          >
            <planeGeometry args={[length, 0.28]} />
            <meshBasicMaterial map={strip} transparent toneMapped={false} />
          </mesh>
          {Array.from({ length: layout.levels }, (_, i) => (
            <Label
              key={i}
              text={`N${i + 1}`}
              position={[row.module1AtEnd ? row.x1 + 0.22 : row.x0 - 0.22, (i + 0.5) * dim.levelHeight, frontZ + row.facing * 0.03]}
              rotation={[0, row.facing === 1 ? 0 : Math.PI, 0]}
              height={0.22}
              background="#f8fafc"
            />
          ))}
        </>
      )}
    </group>
  );
});
