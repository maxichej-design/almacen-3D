import { COLOR_MODES } from '../scene/palette';
import { useMemo } from 'react';
import { useStore } from '../state/store';
import { occupancy } from '../domain/occupancy';
import { QUALITY, type Quality } from '../config/visual';
import { Search } from './Search';

export function Toolbar({ onAbout }: { onAbout: () => void }) {
  const mode = useStore((s) => s.colorMode);
  const setMode = useStore((s) => s.setColorMode);
  const setView = useStore((s) => s.setView);
  const walkMode = useStore((s) => s.walkMode);
  const setWalkMode = useStore((s) => s.setWalkMode);
  const showLabels = useStore((s) => s.showLabels);
  const setShowLabels = useStore((s) => s.setShowLabels);
  const source = useStore((s) => s.inventory.source);
  const setScreen = useStore((s) => s.setScreen);
  const openQad = useStore((s) => s.openQad);
  const setDemo = useStore((s) => s.setDemo);
  const quality = useStore((s) => s.quality);
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const setTab = useStore((s) => s.setTab);
  const occ = useMemo(() => occupancy(wh, index).all, [wh, index]);
  const setQuality = useStore((s) => s.setQuality);

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">▦</span> Deposito3D
        <span className={`brand-tag ${source === 'demo' ? 'demo' : 'real'}`}>{source === 'demo' ? 'demo' : 'datos reales'}</span>
      </div>
      <Search />
      <button
        className="occ-chip"
        onClick={() => {
          setTab('panel');
          setMode('ocupacion');
        }}
        title="Ubicaciones disponibles / total. Clic para ver el tablero"
      >
        <span className="occ-dot" /> <b>{occ.free}</b> libres <span className="muted-on-dark">/ {occ.total}</span>
      </button>
      <div className="seg" role="group" aria-label="Vistas">
        <button onClick={() => setView('general')}>General</button>
        <button onClick={() => setView('planta')}>Planta</button>
        <button onClick={() => setView('sitio')} title="Toda la planta: depósito, oficina, sala de materiales, inyección">Planta completa</button>
        <button className={walkMode ? 'on' : undefined} onClick={() => setWalkMode(!walkMode)} title="Caminar por el depósito en primera persona">
          🚶 Recorrer
        </button>
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
      <label className="select" title="Calidad gráfica: si la PC va lenta, bajala">
        <span>Gráficos</span>
        <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
          {(Object.keys(QUALITY) as Quality[]).map((k) => (
            <option key={k} value={k}>
              {QUALITY[k].label}
            </option>
          ))}
        </select>
      </label>
      <div className="toolbar-end">
        <div className="seg" role="group" aria-label="Menús">
          <button onClick={() => setScreen('inicio')} title="Volver al menú de inicio">☰ Inicio</button>
          <button onClick={() => openQad()} title="Terminal de QAD (simulación)">QAD</button>
          <button onClick={() => setDemo(true)} title="Demostración automática">▶ Demo</button>
        </div>
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
