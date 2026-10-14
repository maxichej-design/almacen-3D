import { useMemo, useState } from 'react';
import { readCsv, toCsv } from '../../data/import/csv';
import { detectColumns, FIELDS, rowsToRecords, type ColumnMapping, type FieldKey } from '../../data/import/mapping';
import { readXlsx, type CellValue, type Sheet } from '../../data/import/xlsx';
import { formatDate, todayIso } from '../../domain/inventory';
import { useStore } from '../../state/store';
import { downloadFile, fmtNum } from '../format';

interface Loaded {
  fileName: string;
  sheets: Sheet[];
}

/** Importación del reporte de stock (Excel .xlsx o CSV) para actualizar el depósito. */
export function DataPanel() {
  const inventory = useStore((s) => s.inventory);
  const wh = useStore((s) => s.warehouse);
  const loadInventory = useStore((s) => s.loadInventory);
  const resetToDemo = useStore((s) => s.resetToDemo);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [skipZero, setSkipZero] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const rows: CellValue[][] = loaded?.sheets[sheetIdx]?.rows ?? [];

  const applySheet = (sheets: Sheet[], i: number) => {
    const det = detectColumns(sheets[i]?.rows ?? []);
    setSheetIdx(i);
    setHeaderRow(det.headerRow);
    setMapping(det.mapping);
  };

  const onFile = async (file: File) => {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const name = file.name.toLowerCase();
      let sheets: Sheet[];
      if (name.endsWith('.xlsb') || name.endsWith('.xls')) {
        throw new Error('Este formato no es compatible. Abrilo en Excel y usá "Guardar como" → Libro de Excel (.xlsx) o CSV.');
      } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
        sheets = [{ name: file.name, rows: readCsv(await file.text()) }];
      } else {
        sheets = readXlsx(await file.arrayBuffer());
      }
      if (!sheets.length) throw new Error('El archivo no tiene hojas con datos.');
      // Elegir la hoja que mejor coincide con un reporte de stock.
      let best = 0;
      let bestScore = -1;
      sheets.forEach((sh, i) => {
        const det = detectColumns(sh.rows);
        const score = Object.keys(det.mapping).length + (det.mapping.location != null ? 5 : 0) + (det.mapping.partNumber != null ? 5 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      });
      setLoaded({ fileName: file.name, sheets });
      applySheet(sheets, best);
    } catch (e) {
      setLoaded(null);
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const result = useMemo(() => {
    if (!loaded || mapping.location == null || mapping.partNumber == null) return null;
    const conv = rowsToRecords(rows, headerRow, mapping, { skipZeroQty: skipZero });
    const codes = new Set(conv.records.map((r) => r.location));
    let known = 0;
    let unknown = 0;
    for (const c of codes) (wh.locationIndex.has(c) || wh.zoneIndex.has(c) ? known++ : unknown++);
    return { ...conv, distinct: codes.size, known, unknown };
  }, [loaded, rows, headerRow, mapping, skipZero, wh]);

  const headers = (rows[headerRow] ?? []).map((h, i) => `${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''} · ${h ?? ''}`);

  const commit = () => {
    if (!result || !loaded) return;
    const saved = loadInventory({ source: 'import', label: loaded.fileName, loadedAt: todayIso(), records: result.records });
    setDone(
      `Se cargaron ${fmtNum(result.records.length)} registros de ${loaded.fileName}.` +
        (saved ? '' : ' Atención: es demasiado grande para guardarlo en esta PC; al cerrar la página habrá que volver a cargarlo.'),
    );
    setLoaded(null);
  };

  const template = () =>
    downloadFile(
      'plantilla-deposito3d.csv',
      toCsv([
        ['Ubicación', 'Producto', 'Descripción', 'Cantidad', 'UM', 'Tipo ABC', 'Fecha ingreso', 'Lote', 'Último conteo', 'Dónde se usa'],
        ['C5.1', 'OTK-10234', 'Clip de fijación tapizado', 500, 'PZ', 'A', '15/09/2026', 'L260915-01', '01/10/2026', 'Ensamble L1'],
        ['W0WIP', 'OTK-10271', 'Tornillo M5x16', 2000, 'PZ', 'B', '02/10/2026', '', '', 'Ensamble L2'],
      ]),
    );

  return (
    <div className="pad">
      <h2>Datos del depósito</h2>
      <div className="source-box">
        <div>
          <span className="muted small">Datos actuales</span>
          <div>
            <b>{inventory.label}</b>
          </div>
          <div className="muted small">
            {fmtNum(inventory.records.length)} registros · cargado el {formatDate(inventory.loadedAt)}
          </div>
        </div>
        {inventory.source === 'import' && (
          <button onClick={() => confirm('¿Volver a los datos de demostración? Se descarta el reporte cargado en esta PC.') && resetToDemo()}>
            Volver a demo
          </button>
        )}
      </div>

      <h3>Actualizar con un reporte</h3>
      <p className="small">
        Subí el reporte de stock por ubicación (Excel <b>.xlsx</b> o <b>.csv</b>). Las columnas se detectan solas: Ubicación, Producto, Cantidad,
        Tipo ABC, fechas… Si alguna no se detecta, elegila abajo. Los datos quedan solo en esta PC.
      </p>
      <label className={`dropzone ${busy ? 'busy' : ''}`}>
        <input
          type="file"
          accept=".xlsx,.csv,.txt,.xlsb,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        {busy ? 'Leyendo…' : '📄 Elegir archivo o arrastrarlo acá'}
      </label>
      <button className="link small" onClick={template}>⬇ Descargar plantilla de ejemplo</button>
      {error && <p className="error">{error}</p>}
      {done && <p className="ok">✓ {done}</p>}

      {loaded && (
        <div className="import">
          <h3>{loaded.fileName}</h3>
          {loaded.sheets.length > 1 && (
            <label className="field">
              <span>Hoja</span>
              <select value={sheetIdx} onChange={(e) => applySheet(loaded.sheets, Number(e.target.value))}>
                {loaded.sheets.map((s, i) => (
                  <option key={i} value={i}>{s.name} ({s.rows.length} filas)</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Fila de títulos</span>
            <input type="number" min={1} max={rows.length} value={headerRow + 1} onChange={(e) => setHeaderRow(Math.max(0, Number(e.target.value) - 1))} />
          </label>
          <div className="mapping">
            {(Object.keys(FIELDS) as FieldKey[]).map((key) => (
              <label key={key} className="field">
                <span>
                  {FIELDS[key].label}
                  {FIELDS[key].required && <b className="req"> *</b>}
                </span>
                <select
                  value={mapping[key] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">— no está —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={skipZero} onChange={(e) => setSkipZero(e.target.checked)} /> Ignorar filas con cantidad 0
          </label>

          {result ? (
            <>
              <div className="import-stats">
                <span><b>{fmtNum(result.records.length)}</b> registros válidos</span>
                <span><b>{fmtNum(result.distinct)}</b> ubicaciones distintas</span>
                <span className={result.unknown ? 'warn' : ''}><b>{fmtNum(result.unknown)}</b> no están en el layout</span>
                <span className="muted">{fmtNum(result.skipped)} filas omitidas</span>
              </div>
              <table className="table preview">
                <thead>
                  <tr><th>Ubic.</th><th>Pieza</th><th className="num">Cant.</th><th>ABC</th><th>Ingreso</th></tr>
                </thead>
                <tbody>
                  {result.records.slice(0, 6).map((r, i) => (
                    <tr key={i}>
                      <td className="code">{r.location}</td>
                      <td>{r.partNumber}</td>
                      <td className="num">{fmtNum(r.qty)}</td>
                      <td>{r.abc ?? '—'}</td>
                      <td>{formatDate(r.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="actions">
                <button className="primary" onClick={commit} disabled={result.records.length === 0}>
                  Cargar al depósito
                </button>
                <button onClick={() => setLoaded(null)}>Cancelar</button>
              </div>
            </>
          ) : (
            <p className="error">Elegí al menos las columnas de Ubicación y Nº de parte.</p>
          )}
        </div>
      )}
    </div>
  );
}
