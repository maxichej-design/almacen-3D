import { AGE_BUCKETS, COUNT_INTERVAL_DAYS, COUNT_WARNING_DAYS } from '../config/policies';
import { OUTSIDE_FIFO_GROUPS, QAD_LOCATIONS, type QadLocation } from '../config/qadLocations';
import type { AbcClass, CountStatus, Inventory, StockRecord, Warehouse } from './types';
import { normalizeLocation } from './warehouse';

/** Ubicaciones de QAD fuera del modelo 3D (despachos, materia prima, calidad...), por código normalizado. */
export const qadLocationIndex = new Map<string, QadLocation>(QAD_LOCATIONS.map((l) => [normalizeLocation(l.code), l]));

const DAY = 86_400_000;

export function todayIso() {
  return toIso(new Date());
}

export function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysSince(iso: string | undefined, today: string): number | undefined {
  if (!iso) return undefined;
  return Math.round((Date.parse(today) - Date.parse(iso)) / DAY);
}

export function addDays(iso: string, days: number) {
  return toIso(new Date(Date.parse(iso) + days * DAY + 12 * 3_600_000));
}

export function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ageBucket(days: number) {
  return AGE_BUCKETS.findIndex((b) => days <= b.max);
}

const CLASS_PRIORITY: Record<AbcClass, number> = { A: 0, B: 1, C: 2, D: 3 };

/** La clase más exigente presente (A > B > C > D). */
export function strongestClass(records: StockRecord[]): AbcClass | undefined {
  let best: AbcClass | undefined;
  for (const r of records) if (r.abc && (!best || CLASS_PRIORITY[r.abc] < CLASS_PRIORITY[best])) best = r.abc;
  return best;
}

export interface CountInfo {
  status: CountStatus;
  lastCountAt?: string;
  dueAt?: string;
  /** Días hasta el vencimiento (negativo = vencido). */
  daysLeft?: number;
}

/** Estado de conteo cíclico de un grupo de registros (una ubicación). */
export function countInfo(records: StockRecord[], today: string, countedAt?: string): CountInfo {
  if (records.length === 0) return { status: 'sin-stock' };
  const active = records.filter((r) => r.abc !== 'D');
  if (active.length === 0) return { status: 'obsoleto', lastCountAt: countedAt ?? minIso(records.map((r) => r.lastCountAt)) };

  let dueAt: string | undefined;
  let lastCountAt: string | undefined;
  for (const r of active) {
    const last = maxIso([r.lastCountAt, countedAt]) ?? r.receivedAt ?? today;
    const due = addDays(last, COUNT_INTERVAL_DAYS[(r.abc ?? 'C') as Exclude<AbcClass, 'D'>]);
    if (!dueAt || due < dueAt) {
      dueAt = due;
      lastCountAt = last;
    }
  }
  const daysLeft = -(daysSince(dueAt, today) ?? 0);
  const status: CountStatus = daysLeft < 0 ? 'vencido' : daysLeft <= COUNT_WARNING_DAYS ? 'por-vencer' : 'al-dia';
  return { status, lastCountAt, dueAt, daysLeft };
}

function minIso(list: Array<string | undefined>) {
  return list.filter(Boolean).sort()[0];
}
function maxIso(list: Array<string | undefined>) {
  const s = list.filter(Boolean).sort();
  return s[s.length - 1];
}

export interface LocationSummary {
  code: string;
  records: StockRecord[];
  partCount: number;
  totalQty: number;
  abc?: AbcClass;
  oldestReceivedAt?: string;
  ageDays?: number;
  count: CountInfo;
}

export interface PartSummary {
  partNumber: string;
  description?: string;
  abc?: AbcClass;
  uom?: string;
  usedIn?: string;
  /** Stock disponible (estanterías y recepción). */
  totalQty: number;
  /** Registros disponibles ordenados FIFO (el más antiguo primero). */
  fifo: StockRecord[];
  /** Registros fuera del FIFO: ya entregados a WIP o en expedición. */
  outside: StockRecord[];
}

export interface InventoryIndex {
  today: string;
  byLocation: Map<string, LocationSummary>;
  byPart: Map<string, PartSummary>;
  /** Stock en ubicaciones de QAD que no están en el modelo 3D (despachos, materia prima, calidad...). */
  offModel: Map<string, StockRecord[]>;
  /** Códigos del reporte que no existen ni en el layout ni en el listado de ubicaciones de QAD. */
  unknown: Map<string, StockRecord[]>;
}

/** Construye todos los índices derivados del inventario. */
export function indexInventory(
  inv: Inventory,
  wh: Warehouse,
  counts: Record<string, string>,
  today = todayIso(),
): InventoryIndex {
  const grouped = new Map<string, StockRecord[]>();
  const unknown = new Map<string, StockRecord[]>();
  const offModel = new Map<string, StockRecord[]>();
  const parts = new Map<string, PartSummary>();

  for (const r of inv.records) {
    const known = wh.locationIndex.has(r.location) || wh.zoneIndex.has(r.location);
    const qadLoc = known ? undefined : qadLocationIndex.get(r.location);
    const target = known ? grouped : qadLoc ? offModel : unknown;
    const list = target.get(r.location);
    if (list) list.push(r);
    else target.set(r.location, [r]);

    let p = parts.get(r.partNumber);
    if (!p) {
      p = { partNumber: r.partNumber, description: r.description, abc: r.abc, uom: r.uom, usedIn: r.usedIn, totalQty: 0, fifo: [], outside: [] };
      parts.set(r.partNumber, p);
    }
    const zoneKind = wh.zoneIndex.get(r.location)?.kind;
    if (zoneKind === 'wip' || zoneKind === 'expedicion' || zoneKind === 'calidad' || (qadLoc && OUTSIDE_FIFO_GROUPS.includes(qadLoc.group))) {
      p.outside.push(r);
    } else {
      p.totalQty += r.qty;
      p.fifo.push(r);
    }
    p.description ??= r.description;
    p.abc ??= r.abc;
    p.usedIn ??= r.usedIn;
  }

  for (const p of parts.values()) {
    p.fifo.sort((a, b) => (a.receivedAt ?? '9999').localeCompare(b.receivedAt ?? '9999'));
  }

  const byLocation = new Map<string, LocationSummary>();
  for (const [code, records] of grouped) {
    const oldest = minIso(records.map((r) => r.receivedAt));
    byLocation.set(code, {
      code,
      records,
      partCount: new Set(records.map((r) => r.partNumber)).size,
      totalQty: records.reduce((s, r) => s + r.qty, 0),
      abc: strongestClass(records),
      oldestReceivedAt: oldest,
      ageDays: daysSince(oldest, today),
      count: countInfo(records, today, counts[code]),
    });
  }

  return { today, byLocation, byPart: parts, offModel, unknown };
}

/** Posición FIFO de un registro dentro de su número de parte (1 = sale primero); null si está fuera del FIFO. */
export function fifoRank(index: InventoryIndex, rec: StockRecord) {
  const p = index.byPart.get(rec.partNumber);
  if (!p) return { rank: 1, total: 1 };
  const i = p.fifo.indexOf(rec);
  return i < 0 ? null : { rank: i + 1, total: p.fifo.length };
}
