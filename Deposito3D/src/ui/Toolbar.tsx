import { COLOR_MODES } from '../scene/palette';
import { useStore } from '../state/store';
import { Search } from './Search';

export function Toolbar({ onAbout }: { onAbout: () => void }) {
  const mode = useStore((s) => s.colorMode);
  const setMode = useStore((s) => s.setColorMode);
  const setView = useStore((s) => s.setView);
  const showLabels = useStore((s) => s.showLabels);
  const setShowLabels = useStore((s) => s.setShowLabels);
  const source = useStore((s) => s.inventory.source);

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">▦</span> Deposito3D
        <span className={`brand-tag ${source === 'demo' ? 'demo' : 'real'}`}>{source === 'demo' ? 'demo' : 'datos reales'}</span>
      </div>
      <Search />
      <div className="seg" role="group" aria-label="Vistas">
        <button onClick={() => setView('general')}>General</button>
        <button onClick={() => setView('planta')}>Planta</button>
      </div>
      <label className="select">
        <span>Ver por</span>
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          {COLOR_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <div className="toolbar-end">
        <label className="check">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Carteles
        </label>
        <button className="ghost" onClick={onAbout} title="Qué es Deposito3D">
          ?
        </button>
      </div>
    </header>
  );
}
