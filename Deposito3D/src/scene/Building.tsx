import { warehouseLayout } from '../config/warehouseLayout';
import { useWarehouse } from '../state/WarehouseContext';
import { SCENE_COLORS } from './colors';
import { Label } from './Label';

const LINE_W = 0.1;

/** Piso, demarcación de pasillos y carteles. */
export function Building() {
  const { model } = useWarehouse();
  const { minX, maxX, minZ, maxZ, height } = model.bounds;
  const m = warehouseLayout.floorMargin;
  const floorW = maxX - minX + m * 2;
  const floorD = maxZ - minZ + m * 2;
  const rowLength = maxX - minX;

  return (
    <group>
      {/* Piso de hormigón */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial color={SCENE_COLORS.floor} roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Pared de fondo y lateral, bajas para no tapar la vista */}
      <mesh position={[0, warehouseLayout.wallHeight / 2, minZ - m]} receiveShadow>
        <boxGeometry args={[floorW, warehouseLayout.wallHeight, 0.2]} />
        <meshStandardMaterial color={SCENE_COLORS.wall} roughness={0.9} />
      </mesh>
      <mesh position={[minX - m, warehouseLayout.wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, warehouseLayout.wallHeight, floorD]} />
        <meshStandardMaterial color={SCENE_COLORS.wallSide} roughness={0.9} />
      </mesh>

      {model.aisles.map((aisle) => {
        // Líneas pegadas al pie de cada fila, como en el piso real.
        const half = aisle.width / 2 - LINE_W / 2 - 0.02;
        return (
          <group key={aisle.id}>
            {/* Líneas amarillas de demarcación del pasillo */}
            {[-half, half].map((dz) => (
              <mesh
                key={dz}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.005, aisle.centerZ + dz]}
                raycast={() => null}
              >
                <planeGeometry args={[rowLength + 2, LINE_W]} />
                <meshBasicMaterial color={SCENE_COLORS.floorLine} />
              </mesh>
            ))}
            {/* Nombre pintado en el piso, en ambas cabeceras */}
            <Label
              text={`${aisle.name.toUpperCase()} (${aisle.sign})`}
              position={[maxX + 0.6, 0.01, aisle.centerZ]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              height={0.9}
              color="#facc15"
              background="#4b5563"
            />
            {/* Letra del pasillo pintada en la pared del fondo + matafuego */}
            <Label
              text={aisle.sign}
              position={[minX - m + 0.11, 4.2, aisle.centerZ]}
              rotation={[0, Math.PI / 2, 0]}
              height={1.1}
              background="#ffffff"
            />
            <mesh position={[minX - m + 0.2, 1.3, aisle.centerZ + 0.6]} raycast={() => null}>
              <cylinderGeometry args={[0.09, 0.09, 0.55, 16]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
            {/* Cartel colgante sobre el pasillo */}
            {[minX - 0.4, maxX + 0.4].map((x) => (
              <Label
                key={x}
                text={`${aisle.sign} · ${aisle.name}`}
                position={[x, height + 0.9, aisle.centerZ]}
                rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
                height={0.55}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
