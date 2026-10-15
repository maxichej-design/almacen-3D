import { Edges } from '@react-three/drei';
import { layout, type WallConfig } from '../config/layout';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';

const noRaycast = () => null;
const LINE_W = 0.1;
const DOOR_H = 4.5;

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(inn.x0 + inn.x1) / 2, 0, (inn.z0 + inn.z1) / 2]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[inn.x1 - inn.x0, inn.z1 - inn.z0]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Paredes (la del frente va baja, "cortada", para poder mirar desde ese lado) */}
      {layout.walls.map((wall) =>
        wallSpans(wall).map(([a, b]) => {
          const box = wallBox(wall, a, b, 0, wall.height);
          return (
            <mesh key={`${wall.id}-${a}`} position={box.position} receiveShadow castShadow={!wall.cut} raycast={noRaycast}>
              <boxGeometry args={box.size} />
              <meshStandardMaterial color={wall.cut ? SCENE.wallSide : SCENE.wall} roughness={0.9} />
            </mesh>
          );
        }),
      )}

      {/* Portones */}
      {layout.doors.map((dr) => {
        const wall = layout.walls.find((w) => w.id === dr.wall);
        if (!wall) return null;
        const vertical = wall.x0 === wall.x1;
        const full = !wall.cut && wall.height > DOOR_H;
        const mid = (dr.from + dr.to) / 2;
        const at = (along: number, y: number): [number, number, number] =>
          vertical ? [wall.x0, y, along] : [along, y, wall.z0];
        // El cartel mira hacia adentro del depósito.
        const inward = vertical ? (wall.x0 <= inn.x0 ? 1 : -1) : wall.z0 <= inn.z0 ? 1 : -1;
        const labelPos: [number, number, number] = vertical
          ? [wall.x0 + inward * 0.12, full ? DOOR_H + 0.75 : 1.1, mid]
          : [mid, full ? DOOR_H + 0.75 : 1.1, wall.z0 + inward * 0.12];
        const labelRot: [number, number, number] = vertical ? [0, inward > 0 ? Math.PI / 2 : -Math.PI / 2, 0] : [0, inward > 0 ? 0 : Math.PI, 0];
        const lintel = wallBox(wall, dr.from, dr.to, DOOR_H, wall.height - DOOR_H);
        const roll = wallBox(wall, dr.from, dr.to, DOOR_H, 0.5, 0.5);
        return (
          <group key={dr.name}>
            {full && (
              <>
                <mesh position={lintel.position} raycast={noRaycast}>
                  <boxGeometry args={lintel.size} />
                  <meshStandardMaterial color={SCENE.wall} roughness={0.9} />
                </mesh>
                <mesh position={roll.position} raycast={noRaycast}>
                  <boxGeometry args={roll.size} />
                  <meshStandardMaterial color={SCENE.door} metalness={0.4} roughness={0.5} />
                </mesh>
              </>
            )}
            {[dr.from, dr.to].map((p) => (
              <mesh key={p} position={at(p, (full ? DOOR_H : 1.2) / 2)} raycast={noRaycast}>
                <boxGeometry args={vertical ? [0.3, full ? DOOR_H : 1.2, 0.15] : [0.15, full ? DOOR_H : 1.2, 0.3]} />
                <meshStandardMaterial color="#facc15" roughness={0.6} />
              </mesh>
            ))}
            <Label text={dr.name.toUpperCase()} position={labelPos} rotation={labelRot} height={0.4} background="#0f172a" color="#facc15" />
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
