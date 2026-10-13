import { getLocationInfo, LOAD_TYPE_LABEL, STATUS_META } from '../data/mockInventory';
import type { Rack, StorageLocation } from '../domain/types';
import { useWarehouse } from '../state/WarehouseContext';

const SIDE_NAME = { I: 'Izquierda', D: 'Derecha' } as const;

export function InfoPanel() {
  const { selection, model } = useWarehouse();

  let content;
  if (selection?.kind === 'location') {
    const loc = model.locationsByCode.get(selection.code);
    content = loc ? <LocationDetails location={loc} /> : null;
  } else if (selection?.kind === 'rack') {
    const rack = model.racksById.get(selection.id);
    content = rack ? <RackDetails rack={rack} /> : null;
  }

  return (
    <aside className={`panel ${selection ? 'has-selection' : ''}`}>
      {content ?? <EmptyState />}
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="panel-empty">
      <h2>Sin selección</h2>
      <p>Hacé clic sobre una ubicación (hueco de la estantería) o sobre la estructura para ver su información.</p>
      <ul className="help">
        <li><b>Rotar:</b> arrastrar con botón izquierdo</li>
        <li><b>Desplazar:</b> arrastrar con botón derecho</li>
        <li><b>Zoom:</b> rueda del mouse</li>
        <li><b>Táctil:</b> 1 dedo rota, 2 dedos zoom/desplazar</li>
      </ul>
    </div>
  );
}

function LocationDetails({ location }: { location: StorageLocation }) {
  const { model, select, focusSelection } = useWarehouse();
  const info = getLocationInfo(location);
  const rack = model.racksById.get(location.rackId)!;
  const meta = STATUS_META[info.status];

  return (
    <div className="panel-body">
      <div className="panel-head">
        <span className="kicker">Ubicación</span>
        <button className="close" onClick={() => select(null)} aria-label="Cerrar">×</button>
      </div>
      <h2 className="code">{location.code}</h2>
      <span className="badge" style={{ background: meta.color }}>{meta.label}</span>

      <dl className="grid">
        <dt>Pasillo</dt><dd>{rack.aisleName}</dd>
        <dt>Lado</dt><dd>{SIDE_NAME[location.side]}</dd>
        <dt>Módulo</dt><dd>{location.bay}</dd>
        <dt>Nivel</dt><dd>{location.level}</dd>
      </dl>

      {info.sku ? (
        <>
          <h3>Contenido</h3>
          <dl className="grid">
            <dt>Artículo</dt><dd>{info.sku}</dd>
            <dt>Descripción</dt><dd>{info.description}</dd>
            {info.loadType && (<><dt>Tipo de carga</dt><dd>{LOAD_TYPE_LABEL[info.loadType]}</dd></>)}
            <dt>Cantidad</dt><dd>{info.quantity} {info.unit}</dd>
            <dt>Lote</dt><dd>{info.lot}</dd>
            <dt>Vencimiento</dt><dd>{info.expiry}</dd>
          </dl>
        </>
      ) : (
        <p className="muted">Ubicación sin mercadería.</p>
      )}

      <h3>Ocupación</h3>
      <div className="bar"><span style={{ width: `${info.fillPercent}%`, background: meta.color }} /></div>
      <p className="muted small">{info.fillPercent}% · Último movimiento: {info.lastMovement}</p>
      {info.note && <p className="note">{info.note}</p>}

      <div className="actions">
        <button onClick={() => focusSelection()}>Centrar vista</button>
        <button onClick={() => select({ kind: 'rack', id: rack.id })}>Ver estantería</button>
      </div>
      <p className="disclaimer">Datos ficticios de demostración.</p>
    </div>
  );
}

function RackDetails({ rack }: { rack: Rack }) {
  const { select, focusSelection, hoveredCode, setHoveredCode } = useWarehouse();
  const counts = { ocupada: 0, libre: 0, reservada: 0, bloqueada: 0 };
  for (const l of rack.locations) counts[getLocationInfo(l).status]++;
  const levels = Array.from({ length: rack.levels }, (_, i) => rack.levels - i);
  // Ordenar módulos de izquierda a derecha según se mira desde el pasillo.
  const bays = Array.from({ length: rack.bays }, (_, i) => (rack.facing === 1 ? i + 1 : rack.bays - i));

  return (
    <div className="panel-body">
      <div className="panel-head">
        <span className="kicker">Estantería</span>
        <button className="close" onClick={() => select(null)} aria-label="Cerrar">×</button>
      </div>
      <h2 className="code">{rack.id}</h2>
      <dl className="grid">
        <dt>Pasillo</dt><dd>{rack.aisleName}</dd>
        <dt>Lado</dt><dd>{SIDE_NAME[rack.side]}</dd>
        <dt>Módulos</dt><dd>{rack.bays}</dd>
        <dt>Niveles</dt><dd>{rack.levels}</dd>
        <dt>Ubicaciones</dt><dd>{rack.locations.length}</dd>
      </dl>

      <h3>Estado</h3>
      <ul className="legend stats">
        {(Object.keys(counts) as Array<keyof typeof counts>).map((s) => (
          <li key={s}>
            <span className="dot" style={{ background: STATUS_META[s].color }} />
            {STATUS_META[s].label}: <b>{counts[s]}</b>
          </li>
        ))}
      </ul>

      <h3>Mapa de ubicaciones</h3>
      <p className="muted small">Vista frontal desde el pasillo. Clic para seleccionar.</p>
      <div className="rack-map" style={{ gridTemplateColumns: `auto repeat(${rack.bays}, 1fr)` }}>
        {levels.map((level) => (
          <div key={level} className="rack-map-row">
            <span className="axis">N{level}</span>
            {bays.map((bay) => {
              const loc = rack.locations.find((l) => l.bay === bay && l.level === level)!;
              const st = getLocationInfo(loc).status;
              return (
                <button
                  key={bay}
                  className={`cell ${hoveredCode === loc.code ? 'hover' : ''}`}
                  style={{ background: STATUS_META[st].color }}
                  title={`${loc.code} · ${STATUS_META[st].label}`}
                  onClick={() => select({ kind: 'location', code: loc.code })}
                  onMouseEnter={() => setHoveredCode(loc.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                />
              );
            })}
          </div>
        ))}
        <div className="rack-map-row">
          <span className="axis" />
          {bays.map((b) => (
            <span key={b} className="axis">{b}</span>
          ))}
        </div>
      </div>

      <div className="actions">
        <button onClick={() => focusSelection()}>Centrar vista</button>
      </div>
      <p className="disclaimer">Datos ficticios de demostración.</p>
    </div>
  );
}
