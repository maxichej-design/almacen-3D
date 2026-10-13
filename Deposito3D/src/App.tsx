import { WarehouseScene } from './scene/WarehouseScene';
import { WarehouseProvider } from './state/WarehouseContext';
import { InfoPanel } from './ui/InfoPanel';
import { Toolbar } from './ui/Toolbar';

export default function App() {
  return (
    <WarehouseProvider>
      <div className="app">
        <Toolbar />
        <main className="main">
          <div className="viewport">
            <WarehouseScene />
          </div>
          <InfoPanel />
        </main>
      </div>
    </WarehouseProvider>
  );
}
