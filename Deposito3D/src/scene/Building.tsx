import { warehouseLayout } from '../config/warehouseLayout';
import { useWarehouse } from '../state/WarehouseContext';
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
        <meshStandardMaterial color="#9ca3af" roughness={0.95} />
      </mesh>

      {/* Pared de fondo y lateral, bajas para no tapar la vista */}
      <mesh position={[0, warehouseLayout.wallHeight / 2, minZ - m]} receiveShadow>
        <boxGeometry args={[floorW, warehouseLayout.wallHeight, 0.2]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.9} />
      </mesh>
      <mesh position={[minX - m, warehouseLayout.wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, warehouseLayout.wallHeight, floorD]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
      </mesh>

      {model.aisles.map((aisle) => {
        const half = aisle.width / 2 - 0.15;
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
                <meshBasicMaterial color="#facc15" />
              </mesh>
            ))}
            {/* Nombre pintado en el piso, en ambas cabeceras */}
            <Label
              text={aisle.name.toUpperCase()}
              position={[maxX + 0.6, 0.01, aisle.centerZ]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              height={0.9}
              color="#facc15"
              background="#4b5563"
            />
            {/* Cartel colgante sobre el pasillo */}
            {[minX - 0.4, maxX + 0.4].map((x) => (
              <Label
                key={x}
                text={`${aisle.id} · ${aisle.name}`}
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
