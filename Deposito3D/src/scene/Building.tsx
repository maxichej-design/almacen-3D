import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';

const noRaycast = () => null;
const LINE_W = 0.1;

/** Piso, paredes, portones, demarcación y carteles fijos. */
export function Building() {
  const wh = useStore((s) => s.warehouse);
  const { minX, maxX, minZ, maxZ, height } = wh.bounds;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const H = layout.wallHeight;
  const rowsEndX = wh.rows[0]?.x1 ?? 0;
  const rowsStartX = wh.rows[0]?.x0 ?? 0;

  return (
    <group>
      {/* Piso epoxi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Pared del fondo (detrás de las filas) y lateral con portones */}
      <mesh position={[minX - 0.1, H / 2, cz]} receiveShadow raycast={noRaycast}>
        <boxGeometry args={[0.2, H, d]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.9} />
      </mesh>
      <mesh position={[cx, H / 2, minZ - 0.1]} receiveShadow raycast={noRaycast}>
        <boxGeometry args={[w, H, 0.2]} />
        <meshStandardMaterial color={SCENE.wallSide} roughness={0.9} />
      </mesh>
      {[3.5, 7.5].map((x) => (
        <group key={x} position={[rowsEndX + x, 0, minZ + 0.01]}>
          <mesh position={[0, 2.25, 0]} raycast={noRaycast}>
            <boxGeometry args={[3.2, 4.5, 0.06]} />
            <meshStandardMaterial color={SCENE.door} metalness={0.4} roughness={0.5} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[0, 0.3 + i * 0.55, 0.035]} raycast={noRaycast}>
              <boxGeometry args={[3.2, 0.03, 0.01]} />
              <meshBasicMaterial color="#64748b" />
            </mesh>
          ))}
          <Label text="PORTÓN" position={[0, 4.9, 0.05]} height={0.35} background="#0f172a" color="#facc15" />
        </group>
      ))}

      {/* Demarcación de pasillos y nombre pintado en el piso */}
      {wh.aisles.map((a) => {
        const half = a.width / 2 - LINE_W / 2 - 0.02;
        return (
          <group key={a.id}>
            {[-half, half].map((dz) => (
              <mesh
                key={dz}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[(rowsStartX + rowsEndX) / 2 + 0.5, 0.004, a.centerZ + dz]}
                raycast={noRaycast}
              >
                <planeGeometry args={[rowsEndX - rowsStartX + 1, LINE_W]} />
                <meshBasicMaterial color={SCENE.floorLine} />
              </mesh>
            ))}
            <Label
              text={`${a.name.toUpperCase()}  ${a.left} | ${a.right}`}
              position={[rowsEndX + 1.4, 0.01, a.centerZ]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              height={0.8}
              color={SCENE.floorLine}
              background="#475569"
            />
            {/* Matafuego al fondo del pasillo */}
            <mesh position={[minX + 0.15, 1.2, a.centerZ + 0.8]} raycast={noRaycast}>
              <cylinderGeometry args={[0.09, 0.09, 0.55, 16]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Línea que separa la playa de las estanterías */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rowsEndX + 0.6, 0.004, cz]} raycast={noRaycast}>
        <planeGeometry args={[LINE_W * 1.5, d - 2]} />
        <meshBasicMaterial color={SCENE.floorLine} />
      </mesh>

      {/* Letra de cada fila pintada en la pared del fondo */}
      {wh.rows.map((r) => (
        <Label
          key={r.id}
          text={r.id}
          position={[minX + 0.02, height + 1.2, (r.z0 + r.z1) / 2]}
          rotation={[0, Math.PI / 2, 0]}
          height={1}
          background="#ffffff"
        />
      ))}
    </group>
  );
}
