import { useStore, type PanelTab } from '../state/store';
import { CountsPanel } from './panels/CountsPanel';
import { Dashboard } from './panels/Dashboard';
import { DataPanel } from './panels/DataPanel';
import { DetailPanel } from './panels/DetailPanel';

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: 'detalle', label: 'Detalle' },
  { id: 'panel', label: 'Tablero' },
  { id: 'conteos', label: 'Conteos' },
  { id: 'datos', label: 'Datos' },
];

export function SidePanel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const hasSelection = useStore((s) => s.selection != null);
  const overdue = useStore((s) => {
    let n = 0;
    for (const l of s.index.byLocation.values()) if (l.count.status === 'vencido') n++;
    return n;
  });

  return (
    <aside className={`panel ${hasSelection ? 'has-selection' : ''}`}>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'conteos' && overdue > 0 && <span className="pill">{overdue}</span>}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {tab === 'detalle' && <DetailPanel />}
        {tab === 'panel' && <Dashboard />}
        {tab === 'conteos' && <CountsPanel />}
        {tab === 'datos' && <DataPanel />}
      </div>
    </aside>
  );
}
