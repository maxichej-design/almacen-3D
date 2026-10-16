/**
 * Inventario de DEMOSTRACIÓN (ficticio, reproducible).
 * Se reemplaza al importar el reporte real desde la pestaña "Datos".
 */
import { COUNT_INTERVAL_DAYS } from '../config/policies';
import { addDays, todayIso } from '../domain/inventory';
import type { AbcClass, Inventory, StockRecord, Warehouse } from '../domain/types';

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DESCRIPTIONS: Array<[string, string]> = [
  ['Clip de fijación tapizado', 'PZ'], ['Tornillo autorroscante M5x16', 'PZ'], ['Resina PP T20 natural', 'KG'],
  ['Espuma PU panel de puerta', 'PZ'], ['Soporte paragolpes trasero', 'PZ'], ['Rejilla frontal', 'PZ'],
  ['Moldura lateral izquierda', 'PZ'], ['Moldura lateral derecha', 'PZ'], ['Etiqueta de trazabilidad', 'ROL'],
  ['Caja corrugada 600x400', 'PZ'], ['Separador para KLT', 'PZ'], ['Cinta doble faz 19 mm', 'ROL'],
  ['Inserto metálico M6', 'PZ'], ['Tapa de guantera', 'PZ'], ['Marco panel de instrumentos', 'PZ'],
  ['Guía de faro', 'PZ'], ['Masterbatch negro', 'KG'], ['Burlete de puerta', 'MT'],
  ['Alfombra piso delantero', 'PZ'], ['Apoyabrazos central', 'PZ'], ['Conducto de ventilación', 'PZ'],
  ['Pasacables de goma', 'PZ'], ['Tuerca jaula M6', 'PZ'], ['Grapa metálica tablero', 'PZ'],
  ['Film stretch 23 µm', 'ROL'], ['Tapizado de techo', 'PZ'], ['Bandeja portaobjetos', 'PZ'],
  ['Embellecedor de manija', 'PZ'], ['Cubierta de columna', 'PZ'], ['Difusor de aire central', 'PZ'],
];

const USED_IN = [
  'Ensamble L1 – Panel de puerta',
  'Ensamble L2 – Tablero',
  'Ensamble L3 – Consola central',
  'Inyección – Paragolpes',
  'Inyección – Molduras',
  'Embalaje / expedición',
];

const CLASS_WEIGHT: Array<[AbcClass, number]> = [['A', 0.2], ['B', 0.3], ['C', 0.38], ['D', 0.12]];

export function buildDemoInventory(wh: Warehouse): Inventory {
  const rnd = rng(20261014);
  const today = todayIso();
  const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)];

  const parts = Array.from({ length: 96 }, (_, i) => {
    const [description, uom] = DESCRIPTIONS[i % DESCRIPTIONS.length];
    let r = rnd();
    let abc: AbcClass = 'C';
    for (const [c, w] of CLASS_WEIGHT) {
      if ((r -= w) <= 0) {
        abc = c;
        break;
      }
    }
    return {
      partNumber: `OTK-${(10234 + i * 37).toString().padStart(5, '0')}`,
      description: i >= DESCRIPTIONS.length ? `${description} v${Math.floor(i / DESCRIPTIONS.length) + 1}` : description,
      uom,
      abc,
      usedIn: pick(USED_IN),
    };
  });
  // Las piezas A rotan más: aparecen más seguido.
  const weighted = parts.flatMap((p) => (p.abc === 'A' ? [p, p, p] : p.abc === 'B' ? [p, p] : [p]));

  const records: StockRecord[] = [];
  // Referencias de tarima correlativas (no usan el aleatorio, así el resto de los datos no cambia).
  let tarima = 0;
  const makeRecord = (location: string, p: (typeof parts)[number], opts: { fresh?: boolean } = {}): StockRecord => {
    const ageMax = p.abc === 'D' ? 900 : 330;
    const ageMin = p.abc === 'D' ? 300 : 1;
    const age = opts.fresh ? Math.floor(rnd() * 3) : ageMin + Math.floor(rnd() * (ageMax - ageMin));
    const receivedAt = addDays(today, -age);
    const interval = p.abc === 'D' ? 365 : COUNT_INTERVAL_DAYS[p.abc as 'A' | 'B' | 'C'];
    const sinceCount = Math.min(age, Math.floor(rnd() * interval * 1.35));
    return {
      location,
      partNumber: p.partNumber,
      description: p.description,
      uom: p.uom,
      abc: p.abc,
      usedIn: p.usedIn,
      qty: p.uom === 'KG' ? 25 * (1 + Math.floor(rnd() * 40)) : 10 * (1 + Math.floor(rnd() * 60)),
      receivedAt,
      lot: `L${receivedAt.replace(/-/g, '').slice(2)}-${Math.floor(rnd() * 90 + 10)}`,
      ref: `T${2594000 + 7 * tarima++}`,
      status: 'GENERAL',
      lastCountAt: opts.fresh ? undefined : addDays(today, -sinceCount),
    };
  };

  for (const loc of wh.locations) {
    if (rnd() > 0.72) continue;
    const n = rnd() < 0.78 ? 1 : rnd() < 0.85 ? 2 : 3;
    for (let i = 0; i < n; i++) records.push(makeRecord(loc.code, pick(weighted)));
  }
  const zoneFill: Record<string, number> = { W0WIP: 12, REC: 9, EXP: 6, F1: 2, L1: 3, Q1: 2 };
  for (const z of wh.zones) {
    if (z.kind === 'servicio' || z.kind === 'bin') continue; // compu, bines de residuos: no guardan stock
    for (let i = 0; i < (zoneFill[z.code] ?? 2); i++) {
      records.push(makeRecord(z.code, pick(weighted), { fresh: z.kind === 'recepcion' }));
    }
  }

  return { source: 'demo', label: 'Datos de demostración (ficticios)', loadedAt: today, records };
}
