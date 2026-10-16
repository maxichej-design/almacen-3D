import { useStore } from '../../state/store';

/** Pantalla de inicio: elegir qué mostrar (ideal para presentar). */
export function Home() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const setTab = useStore((s) => s.setTab);
  const setView = useStore((s) => s.setView);
  const openQad = useStore((s) => s.openQad);
  const setDemo = useStore((s) => s.setDemo);
  const inv = useStore((s) => s.inventory);
  const index = useStore((s) => s.index);
  if (screen !== 'inicio') return null;

  const go = (fn: () => void) => {
    setScreen('app');
    fn();
  };
  const cards = [
    {
      icon: '🏭',
      title: 'Almacén 3D',
      text: 'Recorré el depósito, buscá ubicaciones, piezas y tarimas, y bajá pallets con la apiladora.',
      onClick: () => go(() => setView('general')),
    },
    {
      icon: '📦',
      title: 'Inventario',
      text: 'Tablero de ocupación, conteo cíclico, clases ABC, antigüedad y FIFO.',
      onClick: () => go(() => setTab('panel')),
    },
    {
      icon: '🖥️',
      title: 'QAD',
      text: 'Las consultas de la terminal (3.2, 3.3, transferencias) con los datos del 3D. Simulación.',
      onClick: () => go(() => openQad()),
    },
    {
      icon: '▶',
      title: 'Demo',
      text: 'Presentación automática de todas las funciones, para mostrar el proyecto.',
      onClick: () => go(() => setDemo(true)),
    },
  ];
  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-kicker">Almacén de planta · control de stock</div>
        <h1>
          <span className="brand-mark">▦</span> Deposito3D
        </h1>
        <p className="home-sub">
          El almacén en 3D con el stock de QAD: ubicaciones, FIFO, clases ABC y conteo cíclico, todo a la vista.
        </p>
        <div className="home-cards">
          {cards.map((c) => (
            <button key={c.title} className="home-card" onClick={c.onClick}>
              <span className="home-icon">{c.icon}</span>
              <span className="home-title">{c.title}</span>
              <span className="home-text">{c.text}</span>
            </button>
          ))}
        </div>
        <div className="home-foot">
          Datos: {inv.source === 'demo' ? 'demostración (ficticios)' : inv.label} · {index.byLocation.size} ubicaciones con stock ·{' '}
          {index.byPart.size} números de parte
        </div>
      </div>
    </div>
  );
}
