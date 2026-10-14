import { useMemo, useState } from 'react';
import { COUNT_INTERVAL_DAYS } from '../../config/policies';
import { formatDate } from '../../domain/inventory';
import type { AbcClass } from '../../domain/types';
import { ABC_COLORS, COUNT_COLORS, COUNT_ICON, COUNT_LABEL } from '../../scene/palette';
import { useStore } from '../../state/store';
import { toCsv } from '../../data/import/csv';
import { downloadFile } from '../format';

type Filter = 'pendientes' | 'vencido' | 'por-vencer' | 'obsoleto';

/** Lista de trabajo de conteo cíclico: qué contar y dónde. */
export function CountsPanel() {
  const index = useStore((s) => s.index);
  const wh = useStore((s) => s.warehouse);
  const select = useStore((s) => s.select);
  const walkTo = useStore((s) => s.walkTo);
  const registerCount = useStore((s) => s.registerCount);
  const [filter, setFilter] = useState<Filter>('pendientes');
  const [abc, setAbc] = useState<AbcClass | 'todas'>('todas');

  const list = useMemo(() => {
    return [...index.byLocation.values()]
      .filter((s) => {
        const st = s.count.status;
        const okStatus = filter === 'pendientes' ? st === 'vencido' || st === 'por-vencer' : st === filter;
        return okStatus && (abc === 'todas' || s.abc === abc);
      })
      .sort((a, b) => (a.count.daysLeft ?? 0) - (b.count.daysLeft ?? 0));
  }, [index, filter, abc]);

  const exportCsv = () => {
    const rows: Array<Array<string | number | undefined>> = [
      ['Ubicación', 'Nº de parte', 'Descripción', 'Cantidad sistema', 'UM', 'Clase', 'Último conteo', 'Vence', 'Cantidad contada'],
    ];
    for (const s of list)
      for (const r of s.records)
        rows.push([s.code, r.partNumber, r.description, r.qty, r.uom, r.abc, formatDate(r.lastCountAt), formatDate(s.count.dueAt), '']);
    downloadFile(`conteo-ciclico-${index.today}.csv`, toCsv(rows));
  };

  return (
    <div className="pad">
      <h2>Conteo cíclico</h2>
      <p className="muted small">
        Frecuencia: A cada {COUNT_INTERVAL_DAYS.A} días · B cada {COUNT_INTERVAL_DAYS.B} · C cada {COUNT_INTERVAL_DAYS.C}. D (obsoletas) no se cuentan: se revisan para baja.
      </p>
      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Estado">
          <option value="pendientes">Pendientes (vencidos + por vencer)</option>
          <option value="vencido">Solo vencidos</option>
          <option value="por-vencer">Solo por vencer</option>
          <option value="obsoleto">Obsoletos (D)</option>
        </select>
        <select value={abc} onChange={(e) => setAbc(e.target.value as AbcClass | 'todas')} aria-label="Clase">
          <option value="todas">Todas las clases</option>
          <option value="A">Clase A</option>
          <option value="B">Clase B</option>
          <option value="C">Clase C</option>
          <option value="D">Clase D</option>
        </select>
        <button onClick={exportCsv} disabled={list.length === 0} title="Planilla para imprimir o cargar el conteo">
          ⬇ Descargar planilla
        </button>
      </div>
      <p className="small">{list.length} ubicaciones</p>
      <ul className="count-list">
        {list.slice(0, 200).map((s) => (
          <li key={s.code}>
            <span className="swatch sm" style={{ background: COUNT_COLORS[s.count.status] }} title={COUNT_LABEL[s.count.status]}>
              {COUNT_ICON[s.count.status]}
            </span>
            <button className="link code" onClick={() => select(wh.locationIndex.has(s.code) ? { kind: 'location', code: s.code } : { kind: 'zone', code: s.code }, { fly: true })}>
              {s.code}
            </button>
            {s.abc && <span className="abc" style={{ background: ABC_COLORS[s.abc] }}>{s.abc}</span>}
            <span className="count-info">
              {s.count.status === 'obsoleto'
                ? `${s.records.length} registro(s) obsoleto(s)`
                : s.count.daysLeft! < 0
                  ? `vencido hace ${-s.count.daysLeft!} d`
                  : `vence en ${s.count.daysLeft} d`}
            </span>
            {wh.locationIndex.has(s.code) && (
              <button className="icon" title="Ir caminando" onClick={() => { select({ kind: 'location', code: s.code }); walkTo(s.code); }}>🚶</button>
            )}
            {s.count.status !== 'obsoleto' && (
              <button className="icon" title="Registrar conteo de hoy" onClick={() => registerCount(s.code)}>✓</button>
            )}
          </li>
        ))}
      </ul>
      {list.length > 200 && <p className="muted small">Mostrando 200 de {list.length}. Descargá la planilla para verlas todas.</p>}
    </div>
  );
}
