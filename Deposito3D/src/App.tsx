import { useState } from 'react';
import { WarehouseScene } from './scene/WarehouseScene';
import { About } from './ui/About';
import { Legend } from './ui/Legend';
import { ForkliftHud } from './ui/ForkliftHud';
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
        </div>
        <SidePanel />
      </main>
      {about && <About onClose={() => setAbout(false)} />}
    </div>
  );
}
