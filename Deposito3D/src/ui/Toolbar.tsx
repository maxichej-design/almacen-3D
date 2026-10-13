import { useState, type FormEvent } from 'react';
import { STATUS_META } from '../data/mockInventory';
import type { LocationStatus } from '../domain/types';
import { useWarehouse } from '../state/WarehouseContext';

export function Toolbar() {
  const { model, select, focusSelection, setView, colorByStatus, setColorByStatus } = useWarehouse();
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (model.locationsByCode.has(code)) {
      select({ kind: 'location', code });
      focusSelection({ kind: 'location', code });
      setError(false);
    } else if (model.racksById.has(code)) {
      select({ kind: 'rack', id: code });
      focusSelection({ kind: 'rack', id: code });
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">▦</span> Deposito3D
        <span className="brand-tag">prototipo</span>
      </div>

      <form className="search" onSubmit={onSearch}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(false);
          }}
          placeholder="Buscar ubicación (ej. P1-I-03-2)"
          aria-label="Buscar ubicación"
          className={error ? 'error' : undefined}
        />
        <button type="submit">Ir</button>
      </form>

      <div className="views" role="group" aria-label="Vistas">
        <button onClick={() => setView('general')}>General</button>
        <button onClick={() => setView('planta')}>Planta</button>
        <button onClick={() => setView('frente')}>Cabecera</button>
      </div>

      <label className="toggle">
        <input
          type="checkbox"
          checked={colorByStatus}
          onChange={(e) => setColorByStatus(e.target.checked)}
        />
        Colorear por estado
      </label>

      <ul className="legend">
        {(Object.keys(STATUS_META) as LocationStatus[]).map((s) => (
          <li key={s}>
            <span className="dot" style={{ background: STATUS_META[s].color }} />
            {STATUS_META[s].label}
          </li>
        ))}
      </ul>
    </header>
  );
}
