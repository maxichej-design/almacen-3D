import { Canvas } from '@react-three/fiber';
import { useWarehouse } from '../state/WarehouseContext';
import { Building } from './Building';
import { CameraRig } from './CameraRig';
import { RackModel } from './RackModel';

export function WarehouseScene() {
  const { model, select, hoveredCode, hoveredRackId } = useWarehouse();
  const { minX, maxX, minZ, maxZ } = model.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [span * 0.75, span * 0.6, span * 0.85], fov: 45, near: 0.1, far: 500 }}
      onPointerMissed={() => select(null)}
      style={{ cursor: hoveredCode || hoveredRackId ? 'pointer' : 'grab' }}
    >
      <color attach="background" args={['#e2e8f0']} />
      <fog attach="fog" args={['#e2e8f0', span * 1.6, span * 4]} />

      <hemisphereLight args={['#ffffff', '#8b8f96', 0.9]} />
      <directionalLight
        position={[span * 0.4, span * 0.8, span * 0.3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span * 0.7}
        shadow-camera-right={span * 0.7}
        shadow-camera-top={span * 0.7}
        shadow-camera-bottom={-span * 0.7}
        shadow-camera-far={span * 3}
        shadow-bias={-0.0005}
      />

      <Building />
      {model.racks.map((rack) => (
        <RackModel key={rack.id} rack={rack} />
      ))}

      <CameraRig />
    </Canvas>
  );
}
