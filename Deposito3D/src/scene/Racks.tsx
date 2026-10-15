import { memo, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import type { RackRow } from '../domain/types';
import { useStore } from '../state/store';
import { useBoxInstances, type BoxInstance } from './instancing';
import { Label } from './Label';
import { SCENE } from './palette';
import { stripTexture } from './textures';

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

  const top = layout.levels * dim.levelHeight;
  const length = row.x1 - row.x0;
  const us = dim.uprightSize;
  const frontZ = row.facing === 1 ? row.z1 : row.z0;

  const { uprights, beams } = useMemo(() => {
    const uprights: BoxInstance[] = [];
    const beams: BoxInstance[] = [];
    const uh = top + 0.3;
    for (let i = 0; i <= row.modules; i++) {
      const x = row.x0 + i * dim.bayWidth;
      for (const z of [row.z0 + us / 2, row.z1 - us / 2]) uprights.push({ position: [x, uh / 2, z], scale: [us, uh, us] });
      for (const y of [0.35, uh * 0.5, uh - 0.2])
        uprights.push({ position: [x, y, (row.z0 + row.z1) / 2], scale: [0.04, 0.04, dim.depth - us] });
    }
    for (let k = 1; k <= layout.levels; k++) {
      const y = k * dim.levelHeight;
      for (const z of [row.z0 + us / 2, row.z1 - us / 2])
        beams.push({ position: [(row.x0 + row.x1) / 2, y, z], scale: [length, dim.beamHeight, 0.05] });
    }
    return { uprights, beams };
  }, [row, top, length, us, dim]);

  const uRef = useRef<THREE.InstancedMesh>(null);
  const bRef = useRef<THREE.InstancedMesh>(null);
  useBoxInstances(uRef, uprights);
  useBoxInstances(bRef, beams);

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
      const x = row.x0 + (m - 0.5) * dim.bayWidth;
      const t = row.facing === 1 ? (x - row.x0) / length : (row.x1 - x) / length;
      return { t, text: `${row.id}${m}` };
    });
    return stripTexture(`${row.id}-${row.facing}`, items, Math.round(length * 60), 48);
  }, [row, length, dim.bayWidth]);

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
        <instancedMesh ref={uRef} args={[undefined, undefined, uprights.length]} castShadow>
          <boxGeometry />
          <meshStandardMaterial color={frameColor} metalness={0.3} roughness={0.5} />
        </instancedMesh>
        <instancedMesh ref={bRef} args={[undefined, undefined, beams.length]} castShadow>
          <boxGeometry />
          <meshStandardMaterial color={beamColor} metalness={0.2} roughness={0.55} />
        </instancedMesh>
      </group>

      {/* Protectores rojos en las cabeceras */}
      {[row.x0 - 0.08, row.x1 + 0.08].map((x) => (
        <mesh key={x} position={[x, 0.2, (row.z0 + row.z1) / 2]} raycast={noRaycast}>
          <boxGeometry args={[0.1, 0.4, dim.depth + 0.12]} />
          <meshStandardMaterial color={SCENE.guard} roughness={0.5} />
        </mesh>
      ))}

      {/* Letra de la fila en ambas cabeceras */}
      <Label
        text={row.id}
        position={[row.x1 + 0.06, top + 0.75, (row.z0 + row.z1) / 2]}
        rotation={[0, Math.PI / 2, 0]}
        height={0.85}
        background="#ffffff"
      />
      <Label
        text={row.id}
        position={[row.x0 - 0.06, top + 0.75, (row.z0 + row.z1) / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        height={0.85}
        background="#ffffff"
      />

      {showLabels && (
        <>
          <mesh
            position={[(row.x0 + row.x1) / 2, top + 0.28, frontZ + row.facing * 0.03]}
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
              position={[row.x0 - 0.22, (i + 0.5) * dim.levelHeight, frontZ + row.facing * 0.03]}
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
