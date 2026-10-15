import { Edges } from '@react-three/drei';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';

const noRaycast = () => null;
const LINE_W = 0.1;
const DOOR_H = 4.5;

/** Piso, paredes, demarcación al pie de las filas, huecos vacíos y nombres de pasillos. */
export function Building() {
  const wh = useStore((s) => s.warehouse);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const d = maxZ - minZ;
  const cz = (minZ + maxZ) / 2;
  const H = layout.wallHeight;
  const bay = layout.rack.bayWidth;
  const wallX = layout.wallX;
  // Tramos de pared entre portones.
  const wallSegments: Array<[number, number]> = [];
  let zPrev = minZ;
  for (const dr of [...layout.doors].sort((a, b) => a.z0 - b.z0)) {
    wallSegments.push([zPrev, dr.z0]);
    zPrev = dr.z1;
  }
  wallSegments.push([zPrev, maxZ]);

  return (
    <group>
      {/* Piso epoxi (adentro) y piso exterior, del otro lado de la pared izquierda */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(wallX + maxX) / 2, 0, cz]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[maxX - wallX, d]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.35} metalness={0.05} />
      </mesh>
      {minX < wallX && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(minX + wallX) / 2, -0.01, cz]} receiveShadow raycast={noRaycast}>
          <planeGeometry args={[wallX - minX, d]} />
          <meshStandardMaterial color="#b8bcc2" roughness={0.9} />
        </mesh>
      )}

      {/* Pared izquierda con portones y pared superior (las otras quedan abiertas para mirar) */}
      {wallSegments.map(([za, zb]) => (
        <mesh key={za} position={[wallX - 0.1, H / 2, (za + zb) / 2]} receiveShadow raycast={noRaycast}>
          <boxGeometry args={[0.2, H, zb - za]} />
          <meshStandardMaterial color={SCENE.wall} roughness={0.9} />
        </mesh>
      ))}
      {layout.doors.map((dr) => (
        <group key={dr.name}>
          {/* Dintel con el portón enrollado arriba */}
          <mesh position={[wallX - 0.1, (DOOR_H + H) / 2, (dr.z0 + dr.z1) / 2]} raycast={noRaycast}>
            <boxGeometry args={[0.2, H - DOOR_H, dr.z1 - dr.z0]} />
            <meshStandardMaterial color={SCENE.wall} roughness={0.9} />
          </mesh>
          <mesh position={[wallX - 0.1, DOOR_H + 0.25, (dr.z0 + dr.z1) / 2]} raycast={noRaycast}>
            <boxGeometry args={[0.5, 0.5, dr.z1 - dr.z0]} />
            <meshStandardMaterial color={SCENE.door} metalness={0.4} roughness={0.5} />
          </mesh>
          {/* Parantes amarillos */}
          {[dr.z0, dr.z1].map((z) => (
            <mesh key={z} position={[wallX - 0.1, DOOR_H / 2, z]} raycast={noRaycast}>
              <boxGeometry args={[0.3, DOOR_H, 0.15]} />
              <meshStandardMaterial color="#facc15" roughness={0.6} />
            </mesh>
          ))}
          <Label text="PORTÓN" position={[wallX + 0.02, DOOR_H + 0.75, (dr.z0 + dr.z1) / 2]} rotation={[0, Math.PI / 2, 0]} height={0.4} background="#0f172a" color="#facc15" />
        </group>
      ))}
      <mesh position={[(wallX + maxX) / 2, H / 2, minZ - 0.1]} receiveShadow raycast={noRaycast}>
        <boxGeometry args={[maxX - wallX, H, 0.2]} />
        <meshStandardMaterial color={SCENE.wallSide} roughness={0.9} />
      </mesh>

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
