import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StockRecord } from '../../domain/types';
import { normalizeLocation } from '../../domain/warehouse';
import { useStore } from '../../state/store';
import { MAIN_MENU, MENUS, PROGRAMS, type MenuItem } from './qadMenus';

/*
 * Simulación de la terminal de QAD (pantalla verde, RUMBA / VT320) con los datos de Deposito3D.
 * Reproduce los menús y consultas que se usan en el almacén (ver videos del 15/10):
 *   - Menú principal y 3. Control Inventario
 *   - 3.2 CONS Detalle Invent por Producto (icloiq01.p)
 *   - 3.3 CONS Det Inventario por Almacén
 *   - 3.4.1 Transferencia - Artículo único
 * No se conecta a QAD: es para practicar, presentar y saltar al 3D desde la consulta.
 * Teclas como en QAD: F1 = ejecutar (Ctrl+X), F2 = ayuda (Ctrl+W), F4 = fin (Ctrl+E), Esc = F4.
 */

const WAREHOUSE = '5715';
const COLS = 80;

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length));
const padL = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s);
const center = (s: string, n: number) => pad(' '.repeat(Math.max(0, Math.floor((n - s.length) / 2))) + s, n);
const qty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** dd/mm/aa como QAD. */
const qdate = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');
const today = () => qdate(new Date().toISOString().slice(0, 10));
/** QAD muestra las ubicaciones en minúscula (e2.4, w0.wip). */
const qloc = (code: string) => (code === 'W0WIP' ? 'w0.wip' : code.toLowerCase());

type Screen =
  | { kind: 'menu'; path: string[] }
  | { kind: 'program'; id: string };

interface Field {
  key: string;
  label: string;
  width: number;
}

const FIELDS: Record<string, Field[]> = {
  '3.2': [
    { key: 'producto', label: 'Producto', width: 18 },
    { key: 'almacen', label: 'Almacen', width: 8 },
    { key: 'ubicac', label: 'Ubicac', width: 8 },
    { key: 'lote', label: 'Lote/Serie', width: 18 },
    { key: 'estado', label: 'Estado', width: 8 },
  ],
  '3.3': [
    { key: 'almacen', label: 'Almacen', width: 8 },
    { key: 'ubicac', label: 'Ubicac', width: 8 },
    { key: 'producto', label: 'Producto', width: 18 },
  ],
  '3.4.1': [
    { key: 'producto', label: 'Producto', width: 18 },
    { key: 'ctd', label: 'Cantidad', width: 10 },
    { key: 'desde', label: 'Desde Ubicac', width: 8 },
    { key: 'ref', label: 'Referencia', width: 10 },
    { key: 'a', label: 'A Ubicac', width: 8 },
  ],
};

export function QadTerminal() {
  const qadState = useStore((s) => s.qad);
  const close = useStore((s) => s.closeQad);
  const index = useStore((s) => s.index);
  const wh = useStore((s) => s.warehouse);
  const select = useStore((s) => s.select);
  const transfer = useStore((s) => s.transferStock);

  const [screen, setScreen] = useState<Screen>({ kind: 'menu', path: [] });
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [field, setField] = useState(0);
  const [results, setResults] = useState<StockRecord[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [lookup, setLookup] = useState<string[] | null>(null);
  const [lookupCursor, setLookupCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const autoRun = useRef(false);

  const openProgram = useCallback((id: string, preset: Record<string, string> = {}) => {
    setScreen({ kind: 'program', id });
    setValues({ almacen: WAREHOUSE, ...preset });
    setField(preset.producto ? 1 : 0);
    setResults(null);
    setCursor(0);
    setMessage('');
    setInput('');
  }, []);

  // Al abrir: menú principal o la consulta pedida (p. ej. desde la ficha de una pieza).
  useEffect(() => {
    if (!qadState.open) return;
    if (qadState.program) {
      openProgram(qadState.program, qadState.partNumber ? { producto: qadState.partNumber } : {});
      autoRun.current = !!qadState.run;
    }
    else {
      setScreen({ kind: 'menu', path: [] });
      setInput('');
      setMessage('');
    }
    setTimeout(() => boxRef.current?.focus(), 0);
  }, [qadState, openProgram]);

  const fields = screen.kind === 'program' ? (FIELDS[screen.id] ?? []) : [];

  const runQuery = useCallback(() => {
    if (screen.kind !== 'program') return;
    const v = values;
    if (screen.id === '3.2') {
      const p = index.byPart.get((v.producto ?? '').trim().toUpperCase()) ?? index.byPart.get((v.producto ?? '').trim());
      if (!p) {
        setMessage('** El producto no existe.  Pulse F2 para ver la lista. **');
        return;
      }
      let rows = [...p.fifo, ...p.outside];
      const ub = normalizeLocation(v.ubicac ?? '');
      if (ub) rows = rows.filter((r) => r.location.startsWith(ub));
      if (v.lote) rows = rows.filter((r) => (r.lot ?? '').includes(v.lote) || (r.ref ?? '').includes(v.lote));
      if (v.estado) rows = rows.filter((r) => (r.status ?? 'GENERAL').toUpperCase().startsWith(v.estado.toUpperCase()));
      rows.sort((a, b) => a.location.localeCompare(b.location) || (a.receivedAt ?? '').localeCompare(b.receivedAt ?? ''));
      setResults(rows);
      setCursor(0);
      setMessage('');
    } else if (screen.id === '3.3') {
      const ub = normalizeLocation(v.ubicac ?? '');
      const pn = (v.producto ?? '').trim().toUpperCase();
      const rows: StockRecord[] = [];
      const all = [...[...index.byLocation.values()].flatMap((s) => s.records), ...[...index.offModel.values()].flat()];
      for (const r of all) {
        if (ub && !r.location.startsWith(ub)) continue;
        if (pn && !r.partNumber.toUpperCase().startsWith(pn)) continue;
        rows.push(r);
      }
      rows.sort((a, b) => a.location.localeCompare(b.location, 'es', { numeric: true }) || a.partNumber.localeCompare(b.partNumber));
      setResults(rows);
      setCursor(0);
      setMessage(rows.length ? '' : '** No hay existencias para esa selección **');
    } else if (screen.id === '3.4.1') {
      const pn = (v.producto ?? '').trim().toUpperCase();
      const err = transfer({
        partNumber: pn,
        from: normalizeLocation(v.desde ?? ''),
        ref: (v.ref ?? '').trim() || undefined,
        to: v.a ?? '',
        qty: Number((v.ctd ?? '').replace(',', '.')),
      });
      if (err) setMessage(`** ${err} **`);
      else {
        setMessage(`Transferencia realizada: ${v.ctd} de ${pn} a ${qloc(normalizeLocation(v.a ?? ''))}.  Se actualizó el 3D.`);
        setValues({ almacen: WAREHOUSE });
        setField(0);
      }
    }
  }, [screen, values, index, transfer]);

  // Consulta pedida desde afuera (demo, ficha de pieza): se ejecuta apenas se cargan los campos.
  useEffect(() => {
    if (autoRun.current && screen.kind === 'program') {
      autoRun.current = false;
      runQuery();
    }
  }, [screen, values, runQuery]);

  const goBack = useCallback(() => {
    setMessage('');
    if (lookup) {
      setLookup(null);
      return;
    }
    if (screen.kind === 'program') {
      if (results) {
        setResults(null);
        return;
      }
      const parts = screen.id.split('.');
      setScreen({ kind: 'menu', path: parts.slice(0, -1) });
      return;
    }
    if (screen.path.length) setScreen({ kind: 'menu', path: screen.path.slice(0, -1) });
    else close();
  }, [screen, results, lookup, close]);

  const choose = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) {
        goBack();
        return;
      }
      const id = screen.kind === 'menu' && !t.includes('.') ? [...screen.path, t].join('.') : t;
      if (PROGRAMS[id]) openProgram(id);
      else if (MENUS[id]) setScreen({ kind: 'menu', path: id.split('.') });
      else setMessage(`** ${id}: función no disponible en la simulación **`);
      setInput('');
    },
    [screen, goBack, openProgram],
  );

  const help = useCallback(() => {
    if (screen.kind === 'program' && fields[field]?.key === 'producto') {
      const pre = (values.producto ?? '').toUpperCase();
      const list = [...index.byPart.keys()].filter((k) => k.toUpperCase().startsWith(pre)).sort();
      setLookup(list.length ? list : [...index.byPart.keys()].sort());
      setLookupCursor(0);
    } else setMessage('Ayuda: F1 ejecuta, F4 vuelve, flechas para moverse. Escriba el número de menú (p. ej. 3.2).');
  }, [screen, fields, field, values, index]);

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    const ctrl = e.ctrlKey && !e.altKey;
    const isF1 = k === 'F1' || (ctrl && k.toLowerCase() === 'x');
    const isF2 = k === 'F2' || (ctrl && k.toLowerCase() === 'w');
    const isF4 = k === 'F4' || k === 'Escape' || (ctrl && k.toLowerCase() === 'e');
    if (isF1 || isF2 || isF4 || k.startsWith('Arrow') || k === 'PageUp' || k === 'PageDown' || k === 'Enter' || k === 'Tab') e.preventDefault();
    if (isF4) return goBack();
    if (isF2) return help();

    if (lookup) {
      if (k === 'ArrowDown') setLookupCursor((c) => Math.min(lookup.length - 1, c + 1));
      else if (k === 'ArrowUp') setLookupCursor((c) => Math.max(0, c - 1));
      else if (k === 'Enter' || isF1) {
        setValues((v) => ({ ...v, producto: lookup[lookupCursor] }));
        setLookup(null);
      }
      return;
    }

    if (screen.kind === 'menu') {
      if (k === 'Enter' || isF1) choose(input);
      else if (k === 'Backspace') setInput((s) => s.slice(0, -1));
      else if (k.length === 1 && /[0-9.]/.test(k)) setInput((s) => (s + k).slice(0, 8));
      return;
    }

    if (results) {
      if (k === 'ArrowDown') setCursor((c) => Math.min(results.length - 1, c + 1));
      else if (k === 'ArrowUp') setCursor((c) => Math.max(0, c - 1));
      else if (k === 'PageDown') setCursor((c) => Math.min(results.length - 1, c + 10));
      else if (k === 'PageUp') setCursor((c) => Math.max(0, c - 10));
      else if (k === 'Enter') verEn3D(results[cursor]);
      return;
    }

    // Edición de campos.
    const f = fields[field];
    if (!f) return;
    if (isF1) return runQuery();
    if (k === 'Enter' || k === 'Tab' || k === 'ArrowDown') {
      if (field === fields.length - 1 && k === 'Enter') runQuery();
      else setField((i) => Math.min(fields.length - 1, i + 1));
    } else if (k === 'ArrowUp') setField((i) => Math.max(0, i - 1));
    else if (k === 'Backspace') setValues((v) => ({ ...v, [f.key]: (v[f.key] ?? '').slice(0, -1) }));
    else if (k.length === 1 && !ctrl) setValues((v) => ({ ...v, [f.key]: ((v[f.key] ?? '') + k.toUpperCase()).slice(0, f.width) }));
  };

  const verEn3D = (r?: StockRecord) => {
    if (!r) return;
    const sel = wh.locationIndex.has(r.location)
      ? { kind: 'location' as const, code: r.location }
      : wh.zoneIndex.has(r.location)
        ? { kind: 'zone' as const, code: r.location }
        : { kind: 'qadloc' as const, code: r.location };
    close();
    select(sel, { fly: true });
  };

  // ------------------------------------------------------------ armado de la pantalla (líneas de 80 col.)

  const lines = useMemo(() => {
    const L: Array<{ t: string; cls?: string; onClick?: () => void }> = [];
    const header = (prog: string, title: string) => {
      L.push({ t: pad(prog, 14) + center(title, COLS - 24) + padL(today(), 10), cls: 'qad-title' });
    };
    if (screen.kind === 'menu') {
      const id = screen.path.join('.');
      if (!id) {
        L.push({ t: pad('mfmenu', 14) + center('SMRC Automotive : qaddb', COLS - 24) + padL(today(), 10), cls: 'qad-title' });
        L.push({ t: center('MENU Principal', COLS) });
        L.push({ t: '' });
        L.push({ t: pad('   DISTRIBUCION', 27) + pad('MANUFACTURING', 27) + 'FINANCIAL', cls: 'qad-hl' });
        for (let i = 0; i < 12; i++) {
          const cell = (it: MenuItem) => pad(`${padL(String(it.n), 3)}. ${it.label}`, 27);
          L.push({ t: cell(MAIN_MENU[i]) + cell(MAIN_MENU[i + 12]) + cell(MAIN_MENU[i + 24]) });
        }
      } else {
        const m = MENUS[id];
        L.push({ t: pad('mfmenu', 14) + center('SMRC Automotive : qaddb', COLS - 24) + padL(today(), 10), cls: 'qad-title' });
        L.push({ t: center(`${id}. ${m.title}`, COLS) });
        L.push({ t: '' });
        const left = m.items.filter((it) => it.n <= 12);
        const right = m.items.filter((it) => it.n > 12);
        for (let i = 0; i < 12; i++) {
          const a = left[i];
          const b = right[i];
          L.push({
            t:
              pad(a ? `${padL(String(a.n), 3)}. ${a.label}` : `${padL(String(i + 1), 3)}.`, 42) +
              (b ? `${padL(String(b.n), 3)}. ${b.label}` : `${padL(String(i + 13), 3)}.`),
          });
        }
      }
      L.push({ t: '' });
      L.push({ t: pad(` Por favor, seleccione una función. F4 o blanco   ${input}_`, COLS), cls: 'qad-box' });
      L.push({ t: message || ' Pulse F2 para obtener Ayuda', cls: message ? 'qad-msg' : undefined });
      return L;
    }

    const id = screen.id;
    const prog = PROGRAMS[id];
    header(prog.file, `${id} ${prog.title}`);
    // Encabezado con los campos de selección.
    const fl = fields;
    L.push({ t: fl.map((f) => pad(f.label, f.width + 1)).join(''), cls: 'qad-dim' });
    L.push({
      t: fl
        .map((f, i) => {
          const v = values[f.key] ?? '';
          return pad(i === field && !results && !lookup ? v + '_' : v, f.width + 1);
        })
        .join(''),
      cls: !results ? 'qad-input' : undefined,
    });

    if (lookup) {
      L.push({ t: '' });
      L.push({ t: ' Producto            Descripción', cls: 'qad-hl' });
      const start = Math.max(0, lookupCursor - 7);
      lookup.slice(start, start + 14).forEach((pn, i) => {
        const p = index.byPart.get(pn);
        L.push({
          t: ' ' + pad(pn, 20) + pad(p?.description ?? '', 40),
          cls: start + i === lookupCursor ? 'qad-sel' : undefined,
          onClick: () => {
            setValues((v) => ({ ...v, producto: pn }));
            setLookup(null);
          },
        });
      });
      L.push({ t: '' });
      L.push({ t: ' Flechas para elegir, [RETURN] para seleccionar, F4 para salir.', cls: 'qad-bar' });
      return L;
    }

    if (id === '3.2' && results) {
      const p = index.byPart.get((values.producto ?? '').trim().toUpperCase());
      const disp = p?.totalQty ?? 0;
      const noMrp = (p?.outside ?? []).reduce((a, r) => a + r.qty, 0);
      L.push({ t: '' });
      L.push({ t: pad('Descripción', 32) + pad('Almacen', 9) + pad('UM', 5) + padL('Exi Disp MRP', 14) + padL('Exist No MRP', 16), cls: 'qad-dim' });
      L.push({ t: pad(p?.description ?? '', 32) + pad(WAREHOUSE, 9) + pad(p?.uom ?? 'EA', 5) + padL(qty(disp), 14) + padL(qty(noMrp), 16) });
      L.push({ t: '' });
      L.push({ t: pad('', 9) + pad('Lote/Serie', 18) + pad('', 9) + pad('Created', 10), cls: 'qad-dim' });
      L.push({ t: pad('Ubicac', 9) + pad('Referencia', 18) + pad('Estado', 9) + pad('Expire', 10) + padL('Ctd Existen', 13) + '  Grado Net', cls: 'qad-dim' });
      L.push({ t: pad('-------- ', 9) + pad('----------------- ', 18) + pad('-------- ', 9) + pad('--------- ', 10) + padL('------------', 13) + '  ----- ---', cls: 'qad-dim' });
      const start = Math.max(0, cursor - 4);
      results.slice(start, start + 6).forEach((r, i) => {
        const sel = start + i === cursor;
        const onClick = () => {
          setCursor(start + i);
          verEn3D(r);
        };
        L.push({
          t: pad(qloc(r.location), 9) + pad(r.lot ?? '', 18) + pad(r.status ?? 'GENERAL', 9) + pad(qdate(r.receivedAt), 10) + padL(qty(r.qty), 13),
          cls: sel ? 'qad-sel' : undefined,
          onClick,
        });
        L.push({ t: pad('', 9) + pad(r.ref ?? '', 18), cls: sel ? 'qad-sel' : undefined, onClick });
      });
      L.push({ t: '' });
      L.push({ t: 'Hojee o escriba texto a buscar y pulse [RETURN]:  ([RETURN] sobre una línea = ver en 3D)' });
      L.push({ t: pad(` Use teclas cursor y pág para moverse.  F4 para salir.  (Línea ${cursor + 1})`, COLS), cls: 'qad-bar' });
      return L;
    }

    if (id === '3.3' && results) {
      L.push({ t: '' });
      L.push({ t: pad('Ubicac', 9) + pad('Producto', 19) + pad('Lote/Serie', 15) + pad('Referencia', 11) + pad('Estado', 9) + padL('Ctd Existen', 13), cls: 'qad-dim' });
      L.push({ t: pad('-------- ', 9) + pad('------------------ ', 19) + pad('-------------- ', 15) + pad('---------- ', 11) + pad('-------- ', 9) + padL('------------', 13), cls: 'qad-dim' });
      const start = Math.max(0, cursor - 6);
      results.slice(start, start + 12).forEach((r, i) => {
        L.push({
          t: pad(qloc(r.location), 9) + pad(r.partNumber, 19) + pad(r.lot ?? '', 15) + pad(r.ref ?? '', 11) + pad(r.status ?? 'GENERAL', 9) + padL(qty(r.qty), 13),
          cls: start + i === cursor ? 'qad-sel' : undefined,
          onClick: () => {
            setCursor(start + i);
            verEn3D(r);
          },
        });
      });
      L.push({ t: '' });
      L.push({ t: pad(` Use teclas cursor y pág para moverse.  F4 para salir.  (Línea ${cursor + 1} de ${results.length})`, COLS), cls: 'qad-bar' });
      return L;
    }

    // Pantalla de selección (antes de ejecutar).
    L.push({ t: '' });
    if (id === '3.4.1') {
      const pn = (values.producto ?? '').trim().toUpperCase();
      const p = index.byPart.get(pn);
      if (p) {
        L.push({ t: pad('Descripción: ' + (p.description ?? ''), COLS) });
        L.push({ t: 'Existencias:', cls: 'qad-dim' });
        for (const r of p.fifo.slice(0, 6)) L.push({ t: '  ' + pad(qloc(r.location), 9) + pad(r.ref ?? '', 11) + padL(qty(r.qty), 12) });
      }
    }
    L.push({ t: '' });
    L.push({ t: message || ' Complete los campos ([RETURN] = siguiente) y pulse F1 para ejecutar.  F2 = lista de productos.', cls: message ? 'qad-msg' : undefined });
    return L;
  }, [screen, input, message, values, field, results, cursor, lookup, lookupCursor, fields, index]);

  if (!qadState.open) return null;

  const fkeys: Array<[string, () => void]> = [
    ['F1-Eje', () => (screen.kind === 'menu' ? choose(input) : results ? verEn3D(results[cursor]) : runQuery())],
    ['2-Ayud', help],
    ['3-Ins', () => {}],
    ['4-Fin', goBack],
    ['6-Mnú', () => setScreen({ kind: 'menu', path: [] })],
    ['7-Rec', () => {}],
    ['8-Lim', () => setValues({ almacen: WAREHOUSE })],
    ['9-Ant', () => setCursor((c) => Math.max(0, c - 1))],
    ['10-Sgte', () => setCursor((c) => (results ? Math.min(results.length - 1, c + 1) : c))],
    ['11-Bu', help],
  ];

  return (
    <div className="qad-overlay" role="dialog" aria-label="Simulación de QAD">
      <div className="qad-window">
        <div className="qad-chrome">
          <span>QAD PROD – Argentina · <b>simulación con los datos de Deposito3D</b></span>
          <button onClick={close} aria-label="Cerrar">✕</button>
        </div>
        <div className="qad-screen" tabIndex={0} ref={boxRef} onKeyDown={onKey}>
          {lines.map((l, i) => (
            <div key={i} className={`qad-line ${l.cls ?? ''}`} onClick={l.onClick} style={l.onClick ? { cursor: 'pointer' } : undefined}>
              {l.t || ' '}
            </div>
          ))}
          <div className="qad-fkeys">
            {fkeys.map(([t, fn]) => (
              <button key={t} onClick={() => { fn(); boxRef.current?.focus(); }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="qad-hint">
          Escribí el número de menú (por ejemplo <b>3</b> y después <b>2</b>, o directo <b>3.2</b>) y Enter. F1 ejecuta, F2 ayuda/lista,
          F4 o Esc vuelve. En una consulta, Enter o clic sobre una línea la muestra en el 3D.
        </div>
      </div>
    </div>
  );
}
