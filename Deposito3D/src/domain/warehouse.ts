import type { WarehouseLayout } from '../config/layout';
import type { Aisle, RackLocation, RackRow, Warehouse, Zone } from './types';

export function locationCode(rowId: string, module: number, level: number) {
  return `${rowId}${module}.${level}`;
}

/**
 * Normaliza un código de ubicación tal como viene de un reporte:
 * "c5.1", "C05.01", "C-5-1", " C5 .1 " → "C5.1". Otros códigos (W0WIP, F1…) quedan en mayúsculas.
 */
export function normalizeLocation(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z])[-_]?0*(\d+)[.\-_,]0*(\d+)$/.exec(s);
  return m ? `${m[1]}${m[2]}.${m[3]}` : s;
}

/**
 * Construye la geometría del depósito.
 *
 * Planta (eje Z): fila izq. | pasillo | fila der. ‖ fila izq. | pasillo | ...
 * Eje X: las filas van de x0 (fondo, módulo N) a x1 = 0 (frente, módulo 1).
 * La playa (zonas WIP, recepción, etc.) ocupa x ∈ [0, stagingDepth].
 */
export function buildWarehouse(cfg: WarehouseLayout): Warehouse {
  const { rack: dim } = cfg;
  const rowLength = cfg.modulesPerRow * dim.bayWidth;
  const x1 = 0;
  const x0 = -rowLength;

  const aisles: Aisle[] = [];
  const rows: RackRow[] = [];
  const locations: RackLocation[] = [];

  let z = 0;
  cfg.aisles.forEach((a, i) => {
    const leftZ = z;
    z += dim.depth;
    const centerZ = z + cfg.aisleWidth / 2;
    z += cfg.aisleWidth;
    const rightZ = z;
    z += dim.depth;
    if (i < cfg.aisles.length - 1) z += cfg.backToBackGap;
    aisles.push({ id: a.id, name: a.name, centerZ, width: cfg.aisleWidth, left: a.left, right: a.right });

    const sides: Array<{ id: string; z0: number; facing: 1 | -1 }> = [
      { id: a.left, z0: leftZ, facing: 1 },
      { id: a.right, z0: rightZ, facing: -1 },
    ];
    for (const s of sides) {
      const row: RackRow = {
        id: s.id,
        aisleId: a.id,
        aisleName: a.name,
        facing: s.facing,
        x0,
        x1,
        z0: s.z0,
        z1: s.z0 + dim.depth,
        locations: [],
      };
      for (let module = 1; module <= cfg.modulesPerRow; module++) {
        for (let level = 1; level <= cfg.levels; level++) {
          const bottom = (level - 1) * dim.levelHeight;
          const loc: RackLocation = {
            code: locationCode(s.id, module, level),
            rowId: s.id,
            aisleId: a.id,
            module,
            level,
            position: [x1 - (module - 0.5) * dim.bayWidth, bottom + dim.levelHeight / 2, s.z0 + dim.depth / 2],
            size: [dim.bayWidth, dim.levelHeight, dim.depth],
            baseY: level === 1 ? 0 : bottom + dim.beamHeight / 2,
            facing: s.facing,
            index: locations.length,
          };
          row.locations.push(loc);
          locations.push(loc);
        }
      }
      rows.push(row);
    }
  });

  const zones: Zone[] = cfg.zones.map((zc) => ({
    code: zc.code,
    name: zc.name,
    kind: zc.kind,
    x0: x1 + zc.x,
    z0: zc.z,
    w: zc.w,
    d: zc.d,
  }));

  const maxZ = Math.max(z, ...zones.map((zn) => zn.z0 + zn.d));
  return {
    aisles,
    rows,
    locations,
    locationIndex: new Map(locations.map((l) => [l.code, l])),
    rowIndex: new Map(rows.map((r) => [r.id, r])),
    zones,
    zoneIndex: new Map(zones.map((zn) => [zn.code, zn])),
    bounds: {
      minX: x0 - cfg.margin,
      maxX: x1 + cfg.stagingDepth,
      minZ: -cfg.margin,
      maxZ: maxZ + cfg.margin,
      height: cfg.levels * dim.levelHeight,
    },
  };
}
