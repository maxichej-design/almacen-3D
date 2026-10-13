import type { WarehouseLayout } from '../config/warehouseLayout';
import type { Aisle, AisleSide, Rack, StorageLocation, WarehouseModel } from './types';

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function locationCode(aisleId: string, side: AisleSide, bay: number, level: number) {
  return `${aisleId}-${side}-${pad2(bay)}-${level}`;
}

/**
 * Construye el modelo del depósito a partir de la configuración.
 *
 * Disposición en planta (eje Z):
 *   [fila P1-I] | pasillo P1 | [fila P1-D][fila P2-I] | pasillo P2 | [fila P2-D] ...
 * Las filas interiores quedan espalda con espalda.
 * El eje X recorre la longitud de las estanterías; el modelo queda centrado en X = 0.
 */
export function generateWarehouse(layout: WarehouseLayout): WarehouseModel {
  const { rack: dim } = layout;
  const rowLength = layout.baysPerRow * dim.bayWidth;
  const startX = -rowLength / 2;
  const totalHeight = dim.firstLevelHeight + layout.levels * dim.levelHeight;

  const aisles: Aisle[] = [];
  const racks: Rack[] = [];
  const locationsByCode = new Map<string, StorageLocation>();
  const racksById = new Map<string, Rack>();

  let z = 0;
  layout.aisles.forEach((aisleCfg, i) => {
    // Fila izquierda del pasillo (mira hacia +Z, hacia el pasillo).
    const leftZ = z;
    z += dim.depth;
    const centerZ = z + layout.aisleWidth / 2;
    z += layout.aisleWidth;
    // Fila derecha del pasillo (mira hacia -Z).
    const rightZ = z;
    z += dim.depth;
    if (i < layout.aisles.length - 1) z += layout.backToBackGap;

    aisles.push({ id: aisleCfg.id, name: aisleCfg.name, centerZ, width: layout.aisleWidth });

    const rows: Array<{ side: AisleSide; z: number; facing: 1 | -1 }> = [
      { side: 'I', z: leftZ, facing: 1 },
      { side: 'D', z: rightZ, facing: -1 },
    ];

    for (const row of rows) {
      const id = `${aisleCfg.id}-${row.side}`;
      const locations: StorageLocation[] = [];
      for (let bay = 1; bay <= layout.baysPerRow; bay++) {
        for (let level = 1; level <= layout.levels; level++) {
          const code = locationCode(aisleCfg.id, row.side, bay, level);
          const loc: StorageLocation = {
            code,
            rackId: id,
            aisleId: aisleCfg.id,
            side: row.side,
            bay,
            level,
            position: [
              startX + (bay - 0.5) * dim.bayWidth,
              dim.firstLevelHeight + (level - 1) * dim.levelHeight + dim.levelHeight / 2,
              row.z + dim.depth / 2,
            ],
            size: [dim.bayWidth, dim.levelHeight, dim.depth],
          };
          locations.push(loc);
          locationsByCode.set(code, loc);
        }
      }
      const rack: Rack = {
        id,
        aisleId: aisleCfg.id,
        aisleName: aisleCfg.name,
        side: row.side,
        origin: [startX, 0, row.z],
        facing: row.facing,
        bays: layout.baysPerRow,
        levels: layout.levels,
        locations,
      };
      racks.push(rack);
      racksById.set(id, rack);
    }
  });

  // Centrar el conjunto en Z.
  const offsetZ = -z / 2;
  for (const a of aisles) a.centerZ += offsetZ;
  for (const r of racks) {
    r.origin[2] += offsetZ;
    for (const l of r.locations) l.position[2] += offsetZ;
  }

  return {
    aisles,
    racks,
    locationsByCode,
    racksById,
    bounds: { minX: startX, maxX: -startX, minZ: offsetZ, maxZ: -offsetZ, height: totalHeight },
  };
}
