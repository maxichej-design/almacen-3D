import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Lighting } from './Lighting';
import { generalView } from './cameraPaths';
import { useStore } from '../state/store';
import { Building } from './Building';
import { CameraRig } from './CameraRig';
import { Forklift } from './Forklift';
import { Highlights } from './Highlights';
import { Loads } from './Loads';
import { LocationPicker } from './LocationPicker';
import { Racks } from './Racks';
import { Zones } from './Zones';
import { Site } from './Site';
import { Effects } from './Effects';
import { QUALITY } from '../config/visual';

export function WarehouseScene() {
  const wh = useStore((s) => s.warehouse);
  const select = useStore((s) => s.select);
  const pointer = useStore((s) => s.hover != null);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const start = generalView(wh)[0];
  const q = useStore((s) => QUALITY[s.quality]);
  const autoLower = useStore((s) => s.autoLowerQuality);

  return (
    <Canvas
      shadows={q.shadows ? 'soft' : false}
      dpr={q.dpr}
      camera={{ position: start.position, fov: 45, near: 0.1, far: 1200 }}
      onPointerMissed={() => select(null)}
      style={{ cursor: pointer ? 'pointer' : 'grab' }}
    >
      <color attach="background" args={['#e2e8f0']} />
      <fog attach="fog" args={['#e2e8f0', span * 3, span * 7]} />
      {/* Si la PC no llega a ~25 cuadros por segundo, baja la calidad un nivel (salvo que se haya elegido a mano). */}
      <PerformanceMonitor bounds={() => [25, 55]} flipflops={3} onDecline={autoLower} />
      <Lighting span={span} cx={cx} cz={cz} shadowMap={q.shadowMap} />

      <Site />
      <Building />
      <Racks />
      <Loads />
      <Zones />
      <Forklift />
      <LocationPicker />
      <Highlights />
      <CameraRig />
      <Effects />
    </Canvas>
  );
}
