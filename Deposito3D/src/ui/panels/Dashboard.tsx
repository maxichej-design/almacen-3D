import { useMemo } from 'react';
import { AGE_BUCKETS } from '../../config/policies';
import { ageBucket, daysSince, formatDate } from '../../domain/inventory';
import type { AbcClass, CountStatus } from '../../domain/types';
import { ABC_COLORS, ABC_LABEL, AGE_COLORS, COUNT_COLORS, COUNT_ICON, COUNT_LABEL } from '../../scene/palette';
import { useStore } from '../../state/store';
import { BarList, Stat } from '../Charts';
import { fmtNum, fmtPct } from '../format';

/** Tablero con los indicadores principales del almacén. */
export function Dashboard() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const inventory = useStore((s) => s.inventory);
  const select = useStore((s) => s.select);
  const setMode = useStore((s) => s.setColorMode);
  const setTab = useStore((s) => s.setTab);

  const k = useMemo(() => {
    const rackSums = wh.locations.map((l) => index.byLocation.get(l.code)).filter((s) => s != null);
    const occupied = rackSums.length;
    const abcLoc: Record<AbcClass, number> = { A: 0, B: 0, C: 0, D: 0 };
    const count: Record<CountStatus, number> = { 'al-dia': 0, 'por-vencer': 0, vencido: 0, obsoleto: 0, 'sin-stock': 0 };
    const ages = AGE_BUCKETS.map(() => 0);
    for (const s of index.byLocation.values()) {
      if (s.abc) abcLoc[s.abc]++;
      count[s.count.status]++;
      if (s.ageDays != null) ages[ageBucket(s.ageDays)]++;
    }
    const abcParts: Record<AbcClass, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const p of index.byPart.values()) if (p.abc) abcParts[p.abc]++;
    const rows = [...wh.rows].sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
      const occ = r.locations.filter((l) => index.byLocation.has(l.code)).length;
      return { id: r.id, occ, pct: occ / r.locations.length };
    });
    const oldest = inventory.records
      .filter((r) => r.receivedAt && r.abc !== 'D')
      .sort((a, b) => a.receivedAt!.localeCompare(b.receivedAt!))
      .slice(0, 6);
    const unknownRecs = [...index.unknown.values()].reduce((s, l) => s + l.length, 0);
    return { occupied, abcLoc, abcParts, count, ages, rows, oldest, unknownRecs };
  }, [wh, index, inventory]);

  const total = wh.locations.length;
  const goMode = (m: Parameters<typeof setMode>[0]) => () => setMode(m);

  return (
    <div className="pad dashboard">
      <p className="source">
        Fuente: <b>{inventory.label}</b> · {formatDate(inventory.loadedAt)}
      </p>
      <div className="stats">
        <Stat label="Ocupación estanterías" value={fmtPct(k.occupied / total)} hint={`${k.occupied} de ${total} ubicaciones`} />
        <Stat label="Números de parte" value={fmtNum(index.byPart.size)} hint={`${fmtNum(inventory.records.length)} registros`} />
        <Stat
          label="Conteos vencidos"
          value={fmtNum(k.count.vencido)}
          hint={`${k.count['por-vencer']} por vencer`}
          tone={k.count.vencido > 0 ? 'bad' : 'good'}
        />
        <Stat label="Ubicaciones con obsoletos (D)" value={fmtNum(k.abcLoc.D)} hint="Revisar para baja" tone={k.abcLoc.D > 0 ? 'warn' : undefined} />
      </div>

      <section>
        <h3>Conteo cíclico <button className="link small" onClick={() => setTab('conteos')}>ver lista →</button></h3>
        <BarList
          unit="ubicaciones"
          data={(['vencido', 'por-vencer', 'al-dia', 'obsoleto'] as CountStatus[]).map((s) => ({
            label: COUNT_LABEL[s],
            value: k.count[s],
            color: COUNT_COLORS[s],
            icon: COUNT_ICON[s],
            onClick: goMode('conteo'),
          }))}
        />
      </section>

      <section>
        <h3>Clasificación ABC (nº de parte)</h3>
        <BarList
          unit="piezas"
          data={(['A', 'B', 'C', 'D'] as AbcClass[]).map((c) => ({
            label: ABC_LABEL[c],
            value: k.abcParts[c],
            color: ABC_COLORS[c],
            onClick: goMode('abc'),
          }))}
        />
      </section>

      <section>
        <h3>Antigüedad del stock (ubicaciones)</h3>
        <BarList
          unit="ubicaciones"
          data={AGE_BUCKETS.map((b, i) => ({ label: b.label, value: k.ages[i], color: AGE_COLORS[i], onClick: goMode('antiguedad') }))}
        />
      </section>

      <section>
        <h3>Ocupación por fila</h3>
        <BarList
          max={100}
          data={k.rows.map((r) => ({
            label: `Fila ${r.id}`,
            value: Math.round(r.pct * 100),
            color: '#2a78d6',
            tip: `Fila ${r.id}: ${r.occ} ubicaciones ocupadas (${fmtPct(r.pct)})`,
            onClick: () => select({ kind: 'row', id: r.id }, { fly: true }),
          }))}
          unit="%"
        />
      </section>

      <section>
        <h3>Stock más antiguo (FIFO)</h3>
        <p className="muted small">Lo primero que debería salir. No incluye obsoletos.</p>
        <table className="table">
          <thead>
            <tr><th>Ubicación</th><th>Pieza</th><th className="num">Días</th></tr>
          </thead>
          <tbody>
            {k.oldest.map((r, i) => (
              <tr key={i} onClick={() => select({ kind: 'part', partNumber: r.partNumber }, { fly: true })}>
                <td className="code">{r.location}</td>
                <td>{r.partNumber}<div className="muted small">{r.description}</div></td>
                <td className="num">{daysSince(r.receivedAt, index.today)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {index.offModel.size > 0 && (
        <section>
          <h3>Stock en otras ubicaciones de QAD</h3>
          <p className="muted small">
            {[...index.offModel.values()].reduce((a, l) => a + l.length, 0)} registros en ubicaciones que no son estanterías del 3D
            (despachos, materia prima, calidad, proveedores…). Se pueden buscar por código.
          </p>
          <p className="chips">
            {[...index.offModel.keys()].slice(0, 40).map((c) => (
              <button key={c} className="chip" onClick={() => select({ kind: 'qadloc', code: c })}>{c}</button>
            ))}
          </p>
        </section>
      )}

      {k.unknownRecs > 0 && (
        <section>
          <h3>⚠ Ubicaciones que no están en el layout</h3>
          <p className="muted small">
            {k.unknownRecs} registros del reporte usan códigos que no están ni en el 3D ni en el listado de ubicaciones de QAD. Revisar si son ubicaciones nuevas.
          </p>
          <p className="chips">
            {[...index.unknown.keys()].slice(0, 40).map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}
