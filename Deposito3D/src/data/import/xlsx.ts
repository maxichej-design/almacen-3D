/**
 * Lector mínimo de .xlsx (Excel 2007+), sin dependencias pesadas:
 * descomprime con fflate y lee el XML de la hoja con DOMParser.
 * Devuelve las celdas como texto, número o fecha ISO (yyyy-mm-dd).
 * Nota: .xlsb (binario) no es compatible: guardar como .xlsx o .csv.
 */
import { strFromU8, unzipSync } from 'fflate';

export type CellValue = string | number | boolean | null;
export interface Sheet {
  name: string;
  rows: CellValue[][];
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function xml(files: Record<string, Uint8Array>, path: string) {
  const f = files[path];
  return f ? new DOMParser().parseFromString(strFromU8(f), 'application/xml') : null;
}

const byTag = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));

/** Convierte un número de serie de Excel en fecha ISO. */
export function excelSerialToIso(serial: number) {
  const ms = Math.round((serial - 25569) * 86_400_000);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function colIndex(ref: string) {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

export function readXlsx(buffer: ArrayBuffer): Sheet[] {
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (f) => f.name.startsWith('xl/') && f.name.endsWith('.xml') || f.name.endsWith('.rels'),
  });

  const shared = (() => {
    const doc = xml(files, 'xl/sharedStrings.xml');
    if (!doc) return [] as string[];
    return byTag(doc, 'si').map((si) => byTag(si, 't').map((t) => t.textContent ?? '').join(''));
  })();

  // Estilos que son fechas.
  const dateStyles = new Set<number>();
  const styles = xml(files, 'xl/styles.xml');
  if (styles) {
    const custom = new Map<number, string>();
    for (const f of byTag(styles, 'numFmt')) custom.set(Number(f.getAttribute('numFmtId')), f.getAttribute('formatCode') ?? '');
    const cellXfs = byTag(styles, 'cellXfs')[0];
    if (cellXfs) {
      Array.from(cellXfs.children).forEach((xf, i) => {
        const id = Number(xf.getAttribute('numFmtId'));
        const code = (custom.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]/g, '').toLowerCase();
        if (BUILTIN_DATE_FORMATS.has(id) || (/[dy]/.test(code) && !/^[#0.,%]+$/.test(code))) dateStyles.add(i);
      });
    }
  }

  // Hojas y sus archivos.
  const wb = xml(files, 'xl/workbook.xml');
  const rels = xml(files, 'xl/_rels/workbook.xml.rels');
  const target = new Map<string, string>();
  if (rels) for (const r of byTag(rels, 'Relationship')) target.set(r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '');
  const sheetsMeta = wb
    ? byTag(wb, 'sheet').map((s) => {
        const rid = s.getAttribute('r:id') ?? s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? '';
        let t = target.get(rid) ?? '';
        t = t.startsWith('/') ? t.slice(1) : `xl/${t}`;
        return { name: s.getAttribute('name') ?? 'Hoja', path: t };
      })
    : [];

  return sheetsMeta.map(({ name, path }) => {
    const doc = xml(files, path);
    const rows: CellValue[][] = [];
    if (!doc) return { name, rows };
    for (const row of byTag(doc, 'row')) {
      const r = Number(row.getAttribute('r') ?? rows.length + 1) - 1;
      const out: CellValue[] = [];
      for (const c of byTag(row, 'c')) {
        const ref = c.getAttribute('r') ?? '';
        const ci = ref ? colIndex(ref) : out.length;
        const t = c.getAttribute('t');
        const s = Number(c.getAttribute('s') ?? -1);
        const v = byTag(c, 'v')[0]?.textContent ?? null;
        let value: CellValue = null;
        if (t === 's') value = v == null ? null : shared[Number(v)] ?? '';
        else if (t === 'inlineStr') value = byTag(c, 't').map((x) => x.textContent ?? '').join('');
        else if (t === 'str') value = v;
        else if (t === 'b') value = v === '1';
        else if (t === 'e') value = null;
        else if (v != null) {
          const num = Number(v);
          value = dateStyles.has(s) && num > 0 ? excelSerialToIso(num) : num;
        }
        out[ci] = value;
      }
      rows[r] = out;
    }
    for (let i = 0; i < rows.length; i++) rows[i] ??= [];
    return { name, rows };
  });
}
