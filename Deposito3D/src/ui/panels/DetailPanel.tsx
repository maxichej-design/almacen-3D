import { layout } from '../../config/layout';
import { daysSince, formatDate, type LocationSummary } from '../../domain/inventory';
import type { RackRow, Zone } from '../../domain/types';
import { ABC_COLORS, ABC_LABEL, COUNT_COLORS, COUNT_ICON, COUNT_LABEL, OCCUPANCY, tintFor } from '../../scene/palette';
import { ZONE_COLORS } from '../../scene/Zones';
import { useStore } from '../../state/store';
import { fmtNum, fmtPct } from '../format';
import { RecordList } from './RecordList';

export function DetailPanel() {
  const selection = useStore((s) => s.selection);
  const wh = useStore((s) => s.warehouse);
  if (!selection) return <Empty />;
  switch (selection.kind) {
    case 'location':
      return <LocationDetail code={selection.code} />;
    case 'row': {
      const row = wh.rowIndex.get(selection.id);
      return row ? <RowDetail row={row} /> : <Empty />;
    }
    case 'zone': {
      const zone = wh.zoneIndex.get(selection.code);
      return zone ? <ZoneDetail zone={zone} /> : <Empty />;
    }
    case 'part':
      return <PartDetail pn={selection.partNumber} />;
  }
}

function Empty() {
  return (
    <div className="pad">
      <h2>Sin selección</h2>
      <p className="muted">Hacé clic en una ubicación, una fila, una zona del piso, o buscá una pieza arriba.</p>
      <ul className="help">
        <li><b>Rotar:</b> arrastrar con el botón izquierdo</li>
        <li><b>Desplazar:</b> arrastrar con el botón derecho</li>
        <li><b>Zoom:</b> rueda del mouse</li>
        <li><b>Táctil:</b> 1 dedo rota, 2 dedos zoom / desplazar</li>
      </ul>
    </div>
  );
}

function Head({ kicker, title, onClose }: { kicker: string; title: string; onClose: () => void }) {
  return (
    <>
      <div className="panel-head">
        <span className="kicker">{kicker}</span>
        <button className="close" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <h2 className="code">{title}</h2>
    </>
  );
}

function CountBadge({ summary }: { summary?: LocationSummary }) {
  if (!summary) return null;
  const c = summary.count;
  const days =
    c.daysLeft == null ? '' : c.daysLeft < 0 ? ` hace ${-c.daysLeft} d` : c.status === 'por-vencer' ? ` en ${c.daysLeft} d` : '';
  return (
    <span className="badge" style={{ background: COUNT_COLORS[c.status] }} title={c.dueAt ? `Próximo conteo: ${formatDate(c.dueAt)}` : undefined}>
      {COUNT_ICON[c.status]} Conteo: {COUNT_LABEL[c.status]}
      {days}
    </span>
  );
}

function LocationDetail({ code }: { code: string }) {
  const wh = useStore((s) => s.warehouse);
  const summary = useStore((s) => s.index.byLocation.get(code));
  const select = useStore((s) => s.select);
  const walkTo = useStore((s) => s.walkTo);
  const focus = useStore((s) => s.focusSelection);
  const registerCount = useStore((s) => s.registerCount);
  const loc = wh.locationIndex.get(code);
  if (!loc) return <Empty />;
  const row = wh.rowIndex.get(loc.rowId)!;

  return (
    <div className="pad">
      <Head kicker="Ubicación" title={code} onClose={() => select(null)} />
      <div className="badges">
        {summary ? (
          <>
            {summary.abc && (
              <span className="badge" style={{ background: ABC_COLORS[summary.abc] }}>
                Clase {summary.abc}
              </span>
            )}
            <CountBadge summary={summary} />
          </>
        ) : (
          <span className="badge free">Libre</span>
        )}
      </div>
      <dl className="grid">
        <dt>Fila</dt><dd>{row.id} · {row.aisleName}</dd>
        <dt>Módulo</dt><dd>{loc.module}</dd>
        <dt>Nivel</dt><dd>{loc.level}{loc.level === 1 ? ' (piso)' : ''}</dd>
        {summary && (
          <>
            <dt>Antigüedad</dt><dd>{summary.ageDays} días (ingreso más viejo)</dd>
            <dt>Próx. conteo</dt><dd>{summary.count.dueAt ? formatDate(summary.count.dueAt) : '—'}</dd>
          </>
        )}
      </dl>

      <div className="actions">
        <button className="primary" onClick={() => walkTo(code)}>🚶 Ir caminando</button>
        <button onClick={focus}>Centrar vista</button>
        <button onClick={() => select({ kind: 'row', id: row.id })}>Ver fila {row.id}</button>
      </div>

      {summary && (
        <>
          <h3>Contenido ({summary.records.length})</h3>
          <RecordList records={summary.records} />
          <div className="actions">
            <button onClick={() => registerCount(code)} title="Registra en esta PC que la ubicación se contó hoy">
              ✓ Registrar conteo de hoy
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function cellColor(sum: LocationSummary | undefined, mode: ReturnType<typeof useStore.getState>['colorMode']) {
  if (!sum) return '#e2e8f0';
  return tintFor(sum, mode) ?? (sum.partCount > 1 ? OCCUPANCY.many : OCCUPANCY.one);
}

function RowDetail({ row }: { row: RackRow }) {
  const index = useStore((s) => s.index);
  const mode = useStore((s) => s.colorMode);
  const select = useStore((s) => s.select);
  const focus = useStore((s) => s.focusSelection);
  const hover = useStore((s) => s.hover);
  const setHover = useStore((s) => s.setHover);
  const sums = row.locations.map((l) => index.byLocation.get(l.code));
  const occupied = sums.filter(Boolean).length;
  const overdue = sums.filter((s) => s?.count.status === 'vencido').length;
  const parts = new Set(sums.flatMap((s) => s?.records.map((r) => r.partNumber) ?? [])).size;
  const levels = Array.from({ length: layout.levels }, (_, i) => layout.levels - i);
  // Módulos de izquierda a derecha según se mira desde el pasillo.
  // facing +1: se mira desde abajo del plano, el módulo 1 (x menor) queda a la izquierda.
  const byX = Array.from({ length: row.modules }, (_, i) => i + 1).sort(
    (a, b) => (row.locations[(a - 1) * layout.levels].position[0]) - (row.locations[(b - 1) * layout.levels].position[0]),
  );
  const modules = row.facing === 1 ? byX : byX.reverse();

  return (
    <div className="pad">
      <Head kicker="Fila de estanterías" title={`Fila ${row.id}`} onClose={() => select(null)} />
      <dl className="grid">
        <dt>Pasillo</dt><dd>{row.aisleName}</dd>
        <dt>Ubicaciones</dt><dd>{row.locations.length} ({row.modules} módulos × {layout.levels} niveles)</dd>
        <dt>Ocupación</dt><dd>{occupied} ({fmtPct(occupied / row.locations.length)})</dd>
        <dt>Nº de parte</dt><dd>{parts}</dd>
        <dt>Conteos vencidos</dt><dd>{overdue}</dd>
      </dl>
      <h3>Frente de la fila</h3>
      <p className="muted small">Vista desde el pasillo, coloreada según “Ver por”. Clic para abrir una ubicación.</p>
      <div className="rack-map" style={{ gridTemplateColumns: `auto repeat(${modules.length}, 1fr)` }}>
        {levels.map((lv) => (
          <div key={lv} className="rack-map-row">
            <span className="axis">N{lv}</span>
            {modules.map((m) => {
              const code = `${row.id}${m}.${lv}`;
              const sum = index.byLocation.get(code);
              return (
                <button
                  key={m}
                  className={`cell ${hover?.id === code ? 'hover' : ''}`}
                  style={{ background: cellColor(sum, mode) }}
                  data-tip={`${code} · ${sum ? `${sum.partCount} pieza(s)` : 'libre'}`}
                  onClick={() => select({ kind: 'location', code })}
                  onMouseEnter={() => setHover({ kind: 'location', id: code })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </div>
        ))}
        <div className="rack-map-row">
          <span className="axis" />
          {modules.map((m) => (
            <span key={m} className="axis">{m}</span>
          ))}
        </div>
      </div>
      <div className="actions">
        <button onClick={focus}>Centrar vista</button>
      </div>
    </div>
  );
}

function ZoneDetail({ zone }: { zone: Zone }) {
  const summary = useStore((s) => s.index.byLocation.get(zone.code));
  const select = useStore((s) => s.select);
  const focus = useStore((s) => s.focusSelection);
  return (
    <div className="pad">
      <Head kicker="Zona de piso" title={zone.code} onClose={() => select(null)} />
      <div className="badges">
        <span className="badge" style={{ background: ZONE_COLORS[zone.kind] }}>{zone.name}</span>
        <CountBadge summary={summary} />
      </div>
      {zone.kind === 'bin' && (
        <p className="note">Bin del hall de entrada para descartes (film o cartón de las cajas abiertas). No es stock.</p>
      )}
      {zone.kind === 'wip' && (
        <p className="note">
          Material entregado al armado (WIP). En planta está en la estantería E, módulos 1 y 2, con el cartel "UBICACIÓN W0-WIP".
        </p>
      )}
      <dl className="grid">
        <dt>Registros</dt><dd>{summary?.records.length ?? 0}</dd>
        <dt>Nº de parte</dt><dd>{summary?.partCount ?? 0}</dd>
        <dt>Cantidad total</dt><dd>{fmtNum(summary?.totalQty ?? 0)}</dd>
      </dl>
      <div className="actions">
        <button onClick={focus}>Centrar vista</button>
      </div>
      {summary && (
        <>
          <h3>Contenido</h3>
          <RecordList records={summary.records} />
        </>
      )}
    </div>
  );
}

function PartDetail({ pn }: { pn: string }) {
  const part = useStore((s) => s.index.byPart.get(pn));
  const today = useStore((s) => s.index.today);
  const select = useStore((s) => s.select);
  const walkTo = useStore((s) => s.walkTo);
  const wh = useStore((s) => s.warehouse);
  if (!part) return <Empty />;
  return (
    <div className="pad">
      <Head kicker="Número de parte" title={pn} onClose={() => select(null)} />
      {part.description && <p className="lead">{part.description}</p>}
      <div className="badges">
        {part.abc && (
          <span className="badge" style={{ background: ABC_COLORS[part.abc] }}>{ABC_LABEL[part.abc]}</span>
        )}
      </div>
      <dl className="grid">
        <dt>Stock disponible</dt><dd>{fmtNum(part.totalQty)} {part.uom ?? ''}</dd>
        <dt>Ubicaciones</dt><dd>{part.fifo.length}</dd>
        {part.usedIn && (<><dt>Se usa en</dt><dd>{part.usedIn}</dd></>)}
      </dl>
      <h3>Orden FIFO (sale primero el de arriba)</h3>
      <ol className="fifo-list">
        {part.fifo.map((r, i) => (
          <li key={`${r.location}-${i}`} className={i === 0 ? 'first' : undefined}>
            <span className="fifo-n">{i + 1}</span>
            <button className="link code" onClick={() => select(wh.locationIndex.has(r.location) ? { kind: 'location', code: r.location } : { kind: 'zone', code: r.location }, { fly: true })}>
              {r.location}
            </button>
            <span className="fifo-info">
              {fmtNum(r.qty)} {r.uom ?? ''} · ingreso {formatDate(r.receivedAt)}
              <span className="muted"> ({daysSince(r.receivedAt, today) ?? '?'} d)</span>
            </span>
            {wh.locationIndex.has(r.location) && (
              <button className="icon" title="Ir caminando" onClick={() => { select({ kind: 'location', code: r.location }); walkTo(r.location); }}>
                🚶
              </button>
            )}
          </li>
        ))}
      </ol>
      {part.fifo.length === 0 && <p className="muted small">Sin stock disponible en el almacén.</p>}
      {part.outside.length > 0 && (
        <>
          <h3>Fuera del almacén (WIP / expedición)</h3>
          <ul className="fifo-list">
            {part.outside.map((r, i) => (
              <li key={`${r.location}-${i}`}>
                <button className="link code" onClick={() => select({ kind: 'zone', code: r.location }, { fly: true })}>
                  {r.location}
                </button>
                <span className="fifo-info">
                  {fmtNum(r.qty)} {r.uom ?? ''} · ingreso {formatDate(r.receivedAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
