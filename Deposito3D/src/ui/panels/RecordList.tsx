import { daysSince, fifoRank, formatDate } from '../../domain/inventory';
import type { StockRecord } from '../../domain/types';
import { ABC_COLORS } from '../../scene/palette';
import { useStore } from '../../state/store';
import { fmtNum } from '../format';

/** Lista de piezas de una ubicación o zona, con su posición FIFO. */
export function RecordList({ records }: { records: StockRecord[] }) {
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
              {r.ref && (
                <>
                  <dt>Tarima</dt>
                  <dd>{r.ref}</dd>
                </>
              )}
              <dt>FIFO</dt>
              <dd>
                {!fifo ? (
                  <span className="muted">Fuera del FIFO (ya salió del almacén)</span>
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
