import { Edges } from '@react-three/drei';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';

const noRaycast = () => null;
const LINE_W = 0.1;

/** Piso, paredes, demarcación al pie de las filas, huecos vacíos y nombres de pasillos. */
export function Building() {
  const wh = useStore((s) => s.warehouse);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const H = layout.wallHeight;
  const bay = layout.rack.bayWidth;

  return (
    <group>
      {/* Piso epoxi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Paredes izquierda y superior del plano (las otras quedan abiertas para mirar) */}
      <mesh position={[minX - 0.1, H / 2, cz]} receiveShadow raycast={noRaycast}>
        <boxGeometry args={[0.2, H, d]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.9} />
      </mesh>
      <mesh position={[cx, H / 2, minZ - 0.1]} receiveShadow raycast={noRaycast}>
        <boxGeometry args={[w, H, 0.2]} />
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
