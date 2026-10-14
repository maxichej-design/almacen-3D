import { normalizeLocation } from '../../domain/warehouse';
import type { AbcClass, StockRecord } from '../../domain/types';
import { excelSerialToIso, type CellValue } from './xlsx';

/** Campos que entiende la aplicación y cómo suelen llamarse las columnas en los reportes. */
export const FIELDS = {
  location: { label: 'Ubicación', required: true, names: ['ubicacion', 'ubicaci', 'location', 'loc', 'ubic', 'posicion', 'bin', 'localizacion'] },
  partNumber: { label: 'Nº de parte', required: true, names: ['producto', 'pieza', 'nroparte', 'numerodeparte', 'numeroparte', 'partnumber', 'pn', 'item', 'articulo', 'codigo', 'material', 'componente', 'part'] },
  description: { label: 'Descripción', required: false, names: ['descripcion', 'descripci', 'description', 'desc', 'denominacion'] },
  qty: { label: 'Cantidad', required: false, names: ['cantidad', 'qty', 'quantity', 'stock', 'existencia', 'qoh', 'saldo', 'cant', 'onhand'] },
  uom: { label: 'Unidad', required: false, names: ['um', 'unidad', 'uom', 'unidadmedida', 'unidaddemedida'] },
  abc: { label: 'Clase ABC', required: false, names: ['tipoabc', 'abc', 'clase', 'categoria', 'clasificacion', 'class'] },
  receivedAt: { label: 'Fecha de ingreso', required: false, names: ['fechaingreso', 'fechadeingreso', 'ingreso', 'fecharecepcion', 'recepcion', 'received', 'receiptdate', 'fechalote', 'fecha', 'date'] },
  lot: { label: 'Lote', required: false, names: ['lote', 'lot', 'batch', 'serie', 'loteserie'] },
  lastCountAt: { label: 'Último conteo', required: false, names: ['ultimoconteo', 'fechaconteo', 'fechaultimoconteo', 'lastcount', 'countdate', 'conteo'] },
  usedIn: { label: 'Dónde se usa', required: false, names: ['usadoen', 'dondeseusa', 'modelo', 'proyecto', 'padre', 'parent', 'ensamble', 'bom'] },
} as const;

export type FieldKey = keyof typeof FIELDS;
export type ColumnMapping = Partial<Record<FieldKey, number>>;

const norm = (v: CellValue) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

function matchField(header: string, key: FieldKey) {
  const names: readonly string[] = FIELDS[key].names;
  if (names.includes(header)) return 2;
  if (header.length >= 3 && names.some((n) => n.length >= 3 && (header.startsWith(n) || header.includes(n)))) return 1;
  return 0;
}

/** Busca la fila de encabezados (la que más columnas reconoce) y propone el mapeo. */
export function detectColumns(rows: CellValue[][]): { headerRow: number; mapping: ColumnMapping } {
  let best = { headerRow: 0, mapping: {} as ColumnMapping, score: -1 };
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const headers = (rows[r] ?? []).map(norm);
    const mapping: ColumnMapping = {};
    let score = 0;
    for (const key of Object.keys(FIELDS) as FieldKey[]) {
      let bestCol = -1;
      let bestQ = 0;
      headers.forEach((h, c) => {
        if (Object.values(mapping).includes(c)) return;
        const q = matchField(h, key);
        if (q > bestQ) {
          bestQ = q;
          bestCol = c;
        }
      });
      if (bestCol >= 0) {
        mapping[key] = bestCol;
        score += bestQ;
      }
    }
    if (score > best.score) best = { headerRow: r, mapping, score };
  }
  return { headerRow: best.headerRow, mapping: best.mapping };
}

function parseNumber(v: CellValue): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  // 1.234,5 (es) o 1,234.5 (en)
  const normalized = /,\d{1,3}$/.test(s) && !/\.\d{1,3}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: CellValue): string | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return v > 20000 && v < 80000 ? excelSerialToIso(v) : undefined;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return undefined;
}

function parseAbc(v: CellValue): AbcClass | undefined {
  const m = /[ABCD]/.exec(String(v ?? '').toUpperCase());
  return m ? (m[0] as AbcClass) : undefined;
}

export interface ConversionResult {
  records: StockRecord[];
  skipped: number;
}

export function rowsToRecords(
  rows: CellValue[][],
  headerRow: number,
  mapping: ColumnMapping,
  opts: { skipZeroQty: boolean },
): ConversionResult {
  const records: StockRecord[] = [];
  let skipped = 0;
  const get = (row: CellValue[], key: FieldKey) => (mapping[key] == null ? null : row[mapping[key]!] ?? null);
  for (const row of rows.slice(headerRow + 1)) {
    const location = normalizeLocation(get(row, 'location'));
    const partNumber = String(get(row, 'partNumber') ?? '').trim();
    if (!location || !partNumber) {
      if (row.some((c) => c != null && c !== '')) skipped++;
      continue;
    }
    const qty = mapping.qty == null ? 1 : parseNumber(get(row, 'qty'));
    if (opts.skipZeroQty && qty === 0) {
      skipped++;
      continue;
    }
    const text = (key: FieldKey) => {
      const v = get(row, key);
      const s = v == null ? '' : String(v).trim();
      return s || undefined;
    };
    records.push({
      location,
      partNumber,
      description: text('description'),
      qty,
      uom: text('uom'),
      abc: parseAbc(get(row, 'abc')),
      receivedAt: parseDate(get(row, 'receivedAt')),
      lot: text('lot'),
      lastCountAt: parseDate(get(row, 'lastCountAt')),
      usedIn: text('usedIn'),
    });
  }
  return { records, skipped };
}
