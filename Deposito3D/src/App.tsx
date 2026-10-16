import { useState } from 'react';
import { WarehouseScene } from './scene/WarehouseScene';
import { About } from './ui/About';
import { Legend } from './ui/Legend';
import { ForkliftHud } from './ui/ForkliftHud';
import { Notice } from './ui/Notice';
import { Home } from './ui/home/Home';
import { Demo } from './ui/home/Demo';
import { QadTerminal } from './ui/qad/QadTerminal';
import { WalkHud } from './ui/WalkHud';
import { Minimap } from './ui/Minimap';
import { SidePanel } from './ui/SidePanel';
import { Toolbar } from './ui/Toolbar';

export default function App() {
  const [about, setAbout] = useState(false);
  return (
    <div className="app">
      <Toolbar onAbout={() => setAbout(true)} />
      <main className="main">
        <div className="viewport">
          <WarehouseScene />
          <Legend />
          <Minimap />
          <WalkHud />
          <ForkliftHud />
          <Notice />
          <Demo />
        </div>
        <SidePanel />
      </main>
      {about && <About onClose={() => setAbout(false)} />}
      <QadTerminal />
      <Home />
    </div>
  );
}
