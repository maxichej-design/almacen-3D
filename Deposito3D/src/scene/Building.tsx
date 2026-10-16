import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { layout, type WallConfig } from '../config/layout';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';
import { concreteMaps, wearTexture } from './pbr';
import { blockTexture, corrugatedTexture, sectionalDoorTexture } from './textures';

const noRaycast = () => null;
const LINE_W = 0.1;
const DOOR_H = 5;
const BLOCK_H = 2.4;

/** Textura de chapa repetida según el largo del tramo. */
function sheetFor(length: number) {
  const t = corrugatedTexture().clone();
  t.repeat.set(Math.max(1, length / 4), 1);
  t.needsUpdate = true;
  return t;
}

/** Textura de bloques escalada al tramo (bloques de 40 × 20 cm). */
function blocksFor(length: number, height: number) {
  const t = blockTexture().clone();
  t.repeat.set(length / 0.8, height / 0.4);
  t.needsUpdate = true;
  return t;
}

/** Piso, paredes, demarcación al pie de las filas, huecos vacíos y nombres de pasillos. */
/** Tramos de una pared que quedan entre portones (en la coordenada a lo largo de la pared). */
function wallSpans(wall: WallConfig): Array<[number, number]> {
  const vertical = wall.x0 === wall.x1;
  const start = vertical ? Math.min(wall.z0, wall.z1) : Math.min(wall.x0, wall.x1);
  const end = vertical ? Math.max(wall.z0, wall.z1) : Math.max(wall.x0, wall.x1);
  const doors = layout.doors.filter((d) => d.wall === wall.id).sort((a, b) => a.from - b.from);
  const spans: Array<[number, number]> = [];
  let cur = start;
  for (const d of doors) {
    if (d.from > cur) spans.push([cur, d.from]);
    cur = Math.max(cur, d.to);
  }
  if (end > cur) spans.push([cur, end]);
  return spans;
}

/** Posición y tamaño de un tramo de pared de altura h, apoyado en y0. */
function wallBox(wall: WallConfig, a: number, b: number, y0: number, h: number, t = 0.2) {
  const vertical = wall.x0 === wall.x1;
  const mid = (a + b) / 2;
  return vertical
    ? { position: [wall.x0, y0 + h / 2, mid] as [number, number, number], size: [t, h, b - a] as [number, number, number] }
    : { position: [mid, y0 + h / 2, wall.z0] as [number, number, number], size: [b - a, h, t] as [number, number, number] };
}

type At = (along: number, y: number, off?: number) => [number, number, number];

/**
 * Hoja del portón seccional (blanca, con la ventanita) que sube y baja, con la cadena de
 * accionamiento manual a la derecha y la botonera a 1,6 m de altura. Tocando la botonera se abre o se cierra.
 */
function SectionalDoor({
  at,
  faceRot,
  mid,
  width,
  rightAlong,
  edgeRight,
}: {
  at: At;
  faceRot: [number, number, number];
  mid: number;
  width: number;
  rightAlong: number;
  edgeRight: number;
}) {
  const leaf = useRef<THREE.Mesh>(null);
  const open = useRef(1); // 1 = abierto (hoja arriba), 0 = cerrado
  const [target, setTarget] = useState(1);
  const [hover, setHover] = useState(false);
  const leafH = DOOR_H;
  useFrame((_, dt) => {
    const k = open.current;
    if (k === target) return;
    // ~6 s en abrir o cerrar del todo, como un portón real.
    const step = Math.min(dt, 0.5) / 6;
    open.current = target > k ? Math.min(target, k + step) : Math.max(target, k - step);
    if (leaf.current) leaf.current.position.y = leafH / 2 + open.current * DOOR_H;
  });
  const chainX = edgeRight + rightAlong * 0.22;
  const boxAlong = edgeRight + rightAlong * 0.55;
  return (
    <group>
      <mesh ref={leaf} position={at(mid, leafH / 2 + DOOR_H, 0.2)} rotation={faceRot} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[width + 0.2, leafH]} />
        <meshStandardMaterial color={SCENE.doorPanel} map={sectionalDoorTexture()} roughness={0.45} metalness={0.1} side={2} />
      </mesh>
      {/* Cadena (dos tramos) y rueda arriba. */}
      {[-0.025, 0.025].map((o) => (
        <mesh key={o} position={at(chainX + o, DOOR_H / 2 + 0.3, 0.3)} raycast={noRaycast}>
          <cylinderGeometry args={[0.008, 0.008, DOOR_H - 0.6, 6]} />
          <meshStandardMaterial color="#5b6168" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={at(chainX, DOOR_H - 0.05, 0.3)} rotation={[faceRot[0], faceRot[1], Math.PI / 2]} raycast={noRaycast}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 20]} />
        <meshStandardMaterial color="#3f444a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Botonera: subir (verde), parar (roja), bajar (negra). */}
      <group
        position={at(boxAlong, 1.6, 0.06)}
        rotation={faceRot}
        onClick={(e) => {
          e.stopPropagation();
          setTarget((t) => (t > 0.5 ? 0 : 1));
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.16, 0.28, 0.09]} />
          <meshStandardMaterial color={hover ? '#fde68a' : '#d4d8dc'} roughness={0.5} />
        </mesh>
        {[
          ['#16a34a', 0.08],
          ['#dc2626', 0],
          ['#111827', -0.08],
        ].map(([c, y]) => (
          <mesh key={c as string} position={[0, y as number, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
            <meshStandardMaterial color={c as string} roughness={0.4} emissive={c as string} emissiveIntensity={0.15} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Piso de hormigón llaneado (repite cada 4 m) con una capa de desgaste por los pasillos. */
function ConcreteFloor() {
  const wh = useStore((s) => s.warehouse);
  const inn = layout.interior;
  const W = inn.x1 - inn.x0;
  const D = inn.z1 - inn.z0;
  const maps = useMemo(() => {
    const { color, rough } = concreteMaps();
    const c = color.clone();
    const r = rough.clone();
    for (const t of [c, r]) {
      t.repeat.set(W / 4, D / 4);
      t.needsUpdate = true;
    }
    return { color: c, rough: r };
  }, [W, D]);
  const wear = useMemo(() => {
    const nx = (x: number) => (x - inn.x0) / W;
    const nz = (z: number) => (z - inn.z0) / D;
    const tracks = wh.aisles.map((a) =>
      a.cross
        ? { x0: nx((a.x0 + a.x1) / 2), y0: nz(a.z0), x1: nx((a.x0 + a.x1) / 2), y1: nz(a.z1), w: 0.05 }
        : { x0: nx(a.x0), y0: nz(a.centerZ), x1: nx(a.x1), y1: nz(a.centerZ), w: 0.08 },
    );
    return wearTexture(`${W}x${D}`, tracks);
  }, [wh, inn, W, D]);
  const cx = (inn.x0 + inn.x1) / 2;
  const cz = (inn.z0 + inn.z1) / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial
          color="#ffffff"
          map={maps.color}
          roughnessMap={maps.rough}
          roughness={0.62}
          metalness={0}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.002, cz]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={wear} transparent depthWrite={false} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Piso, paredes con portones, demarcación al pie de las filas, huecos vacíos y nombres de pasillos. */
export function Building() {
  const wh = useStore((s) => s.warehouse);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const inn = layout.interior;
  const bay = layout.rack.bayWidth;

  return (
    <group>
      {/* Piso exterior y piso epoxi del depósito */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(minX + maxX) / 2, -0.01, (minZ + maxZ) / 2]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[maxX - minX, maxZ - minZ]} />
        <meshStandardMaterial color="#b8bcc2" roughness={0.9} />
      </mesh>
      <ConcreteFloor />

      {/* Paredes: zócalo de bloques gris azulado + chapa acanalada blanca (la del frente va baja para poder
          mirar); la de atrás de D/C/B es toda de bloques pintados de blanco. */}
      {layout.walls.map((wall) =>
        wallSpans(wall).map(([a, b]) => {
          if (wall.finish === 'bloque-blanco') {
            const full = wallBox(wall, a, b, 0, wall.height, 0.22);
            return (
              <mesh key={`${wall.id}-${a}`} position={full.position} receiveShadow raycast={noRaycast}>
                <boxGeometry args={full.size} />
                <meshStandardMaterial color={SCENE.wallBrickWhite} map={blocksFor(b - a, wall.height)} roughness={0.95} />
              </mesh>
            );
          }
          const base = Math.min(BLOCK_H, wall.height);
          const lower = wallBox(wall, a, b, 0, base, 0.22);
          const upper = wall.height > base ? wallBox(wall, a, b, base, wall.height - base) : null;
          return (
            <group key={`${wall.id}-${a}`}>
              <mesh position={lower.position} receiveShadow raycast={noRaycast}>
                <boxGeometry args={lower.size} />
                <meshStandardMaterial color={SCENE.wallBlock} map={blocksFor(b - a, base)} roughness={0.95} />
              </mesh>
              {upper && (
                <mesh position={upper.position} receiveShadow raycast={noRaycast}>
                  <boxGeometry args={upper.size} />
                  <meshStandardMaterial color={SCENE.wallSheet} map={sheetFor(b - a)} roughness={0.55} metalness={0.1} />
                </mesh>
              )}
            </group>
          );
        }),
      )}

      {/* Portones seccionales: abertura de 5 m con la hoja levantada arriba (los tres iguales) */}
      {layout.doors.map((dr) => {
        const wall = layout.walls.find((w) => w.id === dr.wall);
        if (!wall) return null;
        const vertical = wall.x0 === wall.x1;
        const mid = (dr.from + dr.to) / 2;
        const width = dr.to - dr.from;
        const inward = vertical ? (wall.x0 <= inn.x0 ? 1 : -1) : wall.z0 <= inn.z0 ? 1 : -1;
        // Punto sobre la pared, desplazado hacia adentro `off` metros.
        const at = (along: number, y: number, off = 0): [number, number, number] =>
          vertical ? [wall.x0 + inward * off, y, along] : [along, y, wall.z0 + inward * off];
        const faceRot: [number, number, number] = vertical ? [0, inward > 0 ? Math.PI / 2 : -Math.PI / 2, 0] : [0, inward > 0 ? 0 : Math.PI, 0];
        const panelTop = Math.min(DOOR_H + 4.3, layout.wallHeight - 0.2);
        // Lado derecho visto desde adentro (ahí van la cadena y la botonera).
        const rightAlong = vertical ? (inward > 0 ? -1 : 1) : inward > 0 ? 1 : -1;
        return (
          <group key={dr.name}>
            {/* Dintel y pared sobre el portón (solo en paredes altas) */}
            {!wall.cut && (
              <mesh position={wallBox(wall, dr.from, dr.to, DOOR_H, wall.height - DOOR_H).position} raycast={noRaycast}>
                <boxGeometry args={wallBox(wall, dr.from, dr.to, DOOR_H, wall.height - DOOR_H).size} />
                <meshStandardMaterial color={SCENE.wallSheet} map={sheetFor(width)} roughness={0.55} metalness={0.1} />
              </mesh>
            )}
            <SectionalDoor
              at={at}
              faceRot={faceRot}
              mid={mid}
              width={width}
              rightAlong={rightAlong}
              edgeRight={rightAlong > 0 ? dr.to : dr.from}
            />
            {/* Marco claro y guías */}
            {[dr.from - 0.08, dr.to + 0.08].map((p) => (
              <mesh key={p} position={at(p, panelTop / 2, 0.12)} raycast={noRaycast}>
                <boxGeometry args={vertical ? [0.12, panelTop, 0.16] : [0.16, panelTop, 0.12]} />
                <meshStandardMaterial color={SCENE.doorFrame} metalness={0.5} roughness={0.4} />
              </mesh>
            ))}
            <mesh position={at(mid, DOOR_H + 0.05, 0.12)} raycast={noRaycast}>
              <boxGeometry args={vertical ? [0.16, 0.12, width + 0.3] : [width + 0.3, 0.12, 0.16]} />
              <meshStandardMaterial color={SCENE.doorFrame} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Defensas amarillas a los costados */}
            {[dr.from - 0.35, dr.to + 0.35].map((p) => (
              <mesh key={`b${p}`} position={at(p, 0.6, 1.0)} raycast={noRaycast}>
                <cylinderGeometry args={[0.06, 0.06, 1.2, 12]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
            ))}
            <Label text={dr.name.toUpperCase()} position={at(mid, panelTop + 0.35, 0.25)} rotation={faceRot} height={0.4} background="#0f172a" color="#facc15" />
          </group>
        );
      })}

      {wh.rows.map((r) => {
        const front = r.facing === 1 ? r.z1 + 0.08 : r.z0 - 0.08;
        const xa = r.x0 - r.emptyStart;
        const xb = r.x1 + r.emptyEnd;
        const empties = [
          ...(r.emptyStart ? [r.x0 - r.emptyStart / 2] : []),
          ...(r.emptyEnd ? [r.x1 + r.emptyEnd / 2] : []),
        ];
        return (
          <group key={r.id}>
            {/* Línea amarilla al pie del frente */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(xa + xb) / 2, 0.004, front]} raycast={noRaycast}>
              <planeGeometry args={[xb - xa, LINE_W]} />
              <meshBasicMaterial color={SCENE.floorLine} />
            </mesh>
            {/* Huecos sin estantería (cuadros vacíos del plano) */}
            {empties.map((x) => (
              <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, (r.z0 + r.z1) / 2]} raycast={noRaycast}>
                <planeGeometry args={[Math.min(bay / 2, 1.1), layout.rack.depth - 0.1]} />
                <meshBasicMaterial color="#cbd5e1" />
                <Edges color={SCENE.beam} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Nombre de cada pasillo pintado en el piso */}
      {wh.aisles.map((a) =>
        a.cross ? (
          <Label
            key={a.id}
            text={a.name.toUpperCase()}
            position={[(a.x0 + a.x1) / 2, 0.01, a.centerZ]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            height={0.6}
            color={SCENE.floorLine}
            background="#475569"
          />
        ) : (
          [a.x0 + 2.2, a.x1 - 2.2].map((x, i) => (
            <Label
              key={`${a.id}-${i}`}
              text={a.name.toUpperCase()}
              position={[x, 0.01, a.centerZ]}
              rotation={[-Math.PI / 2, 0, i === 0 ? -Math.PI / 2 : Math.PI / 2]}
              height={0.7}
              color={SCENE.floorLine}
              background="#475569"
            />
          ))
        ),
      )}
    </group>
  );
}
