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

/** Construye la geometría del depósito a partir del layout (plano de ingeniería). */
export function buildWarehouse(cfg: WarehouseLayout): Warehouse {
  const { rack: dim } = cfg;
  const locations: RackLocation[] = [];

  const rows: RackRow[] = cfg.rows.map((rc) => {
    const x0 = rc.x;
    const x1 = rc.x + rc.modules * dim.bayWidth;
    const aisleName = cfg.aisles.find((a) => a.id === rc.aisle)?.name ?? `Pasillo ${rc.aisle}`;
    const row: RackRow = {
      id: rc.id,
      aisleId: rc.aisle,
      aisleName,
      facing: rc.facing,
      x0,
      x1,
      z0: rc.z,
      z1: rc.z + dim.depth,
      modules: rc.modules,
      emptyStart: rc.emptyStart ?? 0,
      emptyEnd: rc.emptyEnd ?? 0,
      locations: [],
    };
    for (let module = 1; module <= rc.modules; module++) {
      for (let level = 1; level <= cfg.levels; level++) {
        const bottom = (level - 1) * dim.levelHeight;
        const loc: RackLocation = {
          code: locationCode(rc.id, module, level),
          rowId: rc.id,
          aisleId: rc.aisle,
          module,
          level,
          position: [x0 + (module - 0.5) * dim.bayWidth, bottom + dim.levelHeight / 2, rc.z + dim.depth / 2],
          size: [dim.bayWidth, dim.levelHeight, dim.depth],
          baseY: level === 1 ? 0 : bottom + dim.beamHeight / 2,
          facing: rc.facing,
          index: locations.length,
        };
        row.locations.push(loc);
        locations.push(loc);
      }
    }
    return row;
  });

  const aisles: Aisle[] = cfg.aisles.map((a) => ({
    ...a,
    centerZ: (a.z0 + a.z1) / 2,
    cross: a.z1 - a.z0 > a.x1 - a.x0,
  }));

  const zones: Zone[] = cfg.zones.map((zc) => ({
    code: zc.code,
    name: zc.name,
    kind: zc.kind,
    x0: zc.x,
    z0: zc.z,
    w: zc.w,
    d: zc.d,
  }));

  const b = cfg.building;
  return {
    aisles,
    rows,
    locations,
    locationIndex: new Map(locations.map((l) => [l.code, l])),
    rowIndex: new Map(rows.map((r) => [r.id, r])),
    zones,
    zoneIndex: new Map(zones.map((z) => [z.code, z])),
    bounds: { minX: b.x0, maxX: b.x1, minZ: b.z0, maxZ: b.z1, height: cfg.levels * dim.levelHeight },
  };
}
