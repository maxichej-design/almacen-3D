import { Canvas } from '@react-three/fiber';
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

export function WarehouseScene() {
  const wh = useStore((s) => s.warehouse);
  const select = useStore((s) => s.select);
  const pointer = useStore((s) => s.hover != null);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const start = generalView(wh)[0];

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: start.position, fov: 45, near: 0.1, far: 600 }}
      onPointerMissed={() => select(null)}
      style={{ cursor: pointer ? 'pointer' : 'grab' }}
    >
      <color attach="background" args={['#e2e8f0']} />
      <fog attach="fog" args={['#e2e8f0', span * 1.5, span * 3.5]} />
      <Lighting span={span} cx={cx} cz={cz} />

      <Building />
      <Racks />
      <Loads />
      <Zones />
      <Forklift />
      <LocationPicker />
      <Highlights />
      <CameraRig />
    </Canvas>
  );
}
