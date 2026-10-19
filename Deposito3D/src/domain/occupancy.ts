import type { InventoryIndex } from './inventory';
import type { Warehouse } from './types';

/**
 * Módulos de estantería destinados a otra cosa: no cuentan como disponibles para guardar stock.
 * A18–A19 = A2.QC (material no conforme).
 */
export const RESERVED_MODULES: Array<{ row: string; modules: number[]; reason: string }> = [
  { row: 'A', modules: [18, 19], reason: 'A2.QC (no conforme)' },
];

export interface OccCount {
  total: number;
  used: number;
  /** Libres y disponibles para guardar (sin contar reservadas). */
  free: number;
  /** Libres pero destinadas a otro uso (A2.QC). */
  reserved: number;
}

const empty = (): OccCount => ({ total: 0, used: 0, free: 0, reserved: 0 });

export function isReserved(row: string, module: number) {
  return RESERVED_MODULES.some((r) => r.row === row && r.modules.includes(module));
}

/** Ocupación de las estanterías: total, por fila y por nivel. */
export function occupancy(wh: Warehouse, index: InventoryIndex) {
  const all = empty();
  const byRow = new Map<string, OccCount>();
  const byLevel = new Map<number, OccCount>();
  for (const l of wh.locations) {
    const used = index.byLocation.has(l.code);
    const reserved = !used && isReserved(l.rowId, l.module);
    for (const c of [all, byRow.get(l.rowId) ?? byRow.set(l.rowId, empty()).get(l.rowId)!, byLevel.get(l.level) ?? byLevel.set(l.level, empty()).get(l.level)!]) {
      c.total++;
      if (used) c.used++;
      else if (reserved) c.reserved++;
      else c.free++;
    }
  }
  return { all, byRow, byLevel };
}
