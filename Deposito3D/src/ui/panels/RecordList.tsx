import { qadLocationIndex } from '../../domain/inventory';
import { daysSince, fifoRank, formatDate } from '../../domain/inventory';
import type { StockRecord } from '../../domain/types';
import { ABC_COLORS } from '../../scene/palette';
import { useStore } from '../../state/store';
import { fmtNum } from '../format';

/**
 * Contenido de una ubicación o zona agrupado por TARIMA (la etiqueta del pallet es el dato principal):
 * cada tarima es un título y debajo van sus piezas. Una ubicación puede tener varias tarimas y una
 * tarima puede llevar varias piezas.
 */
export function RecordList({ records }: { records: StockRecord[] }) {
  const groups = new Map<string, StockRecord[]>();
  for (const r of records) {
    const k = r.ref ?? '';
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  // Primero las tarimas con número (en orden), al final lo que no tiene tarima.
  const keys = [...groups.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  return (
    <div className="tarimas">
      {keys.map((k) => {
        const list = groups.get(k)!;
        const parts = new Set(list.map((r) => r.partNumber)).size;
        return (
          <section key={k || '-'} className="tarima">
            <div className="tarima-head">
              <span className="tarima-tag">🏷</span>
              <span className="tarima-ref">{k ? `Tarima ${k}` : 'Sin número de tarima'}</span>
              <span className="tarima-meta">
                {parts} {parts === 1 ? 'pieza' : 'piezas'}
              </span>
            </div>
            <PartLines records={list} />
          </section>
        );
      })}
    </div>
  );
}

function PartLines({ records }: { records: StockRecord[] }) {
  const index = useStore((s) => s.index);
  const select = useStore((s) => s.select);
  return (
    <ul className="records">
      {records.map((r, i) => {
        const fifo = fifoRank(index, r);
        const age = daysSince(r.receivedAt, index.today);
        return (
          <li key={`${r.partNumber}-${i}`} className="record">
            <div className="record-head">
              <button className="link pn" onClick={() => select({ kind: 'part', partNumber: r.partNumber }, { fly: true })} title="Ver todas las ubicaciones de esta pieza">
                {r.partNumber}
              </button>
              {r.abc && (
                <span className="abc" style={{ background: ABC_COLORS[r.abc] }} title={`Clase ${r.abc}`}>
                  {r.abc}
                </span>
              )}
              <span className="qty">
                {fmtNum(r.qty)} {r.uom ?? ''}
              </span>
            </div>
            {r.description && <div className="desc">{r.description}</div>}
            <dl className="mini">
              <dt>Ingreso</dt>
              <dd>
                {formatDate(r.receivedAt)}
                {age != null && <span className="muted"> · {age} días</span>}
              </dd>
              {r.lot && (
                <>
                  <dt>Lote</dt>
                  <dd>{r.lot}</dd>
                </>
              )}
              <dt>FIFO</dt>
              <dd>
                {!fifo ? (
                  <span className="muted">Fuera del FIFO del almacén{qadLocationIndex.get(r.location) ? ` · ${qadLocationIndex.get(r.location)!.desc}` : ' (WIP / expedición)'}</span>
                ) : fifo.total > 1 ? (
                  <span className={fifo.rank === 1 ? 'fifo first' : 'fifo'}>
                    {fifo.rank === 1 ? 'Sale primero' : `Posición ${fifo.rank}`} de {fifo.total}
                  </span>
                ) : (
                  <span className="muted">Única ubicación</span>
                )}
              </dd>
              {r.usedIn && (
                <>
                  <dt>Se usa en</dt>
                  <dd>{r.usedIn}</dd>
                </>
              )}
              <dt>Últ. conteo</dt>
              <dd>{formatDate(r.lastCountAt)}</dd>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
