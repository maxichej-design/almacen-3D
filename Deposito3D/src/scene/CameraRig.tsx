import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useWarehouse } from '../state/WarehouseContext';

/**
 * Controles de navegación (rotar / acercar / desplazar) y animación suave
 * de la cámara cuando se pide una vista o centrar una selección.
 */
export function CameraRig() {
  const { cameraRequest, model } = useWarehouse();
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const anim = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null);

  useEffect(() => {
    if (!cameraRequest) return;
    anim.current = {
      target: new THREE.Vector3(...cameraRequest.target),
      position: new THREE.Vector3(...cameraRequest.position),
    };
  }, [cameraRequest]);

  // Si el usuario empieza a mover la cámara, se cancela la animación en curso.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (anim.current = null);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  useFrame((_, delta) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    const t = 1 - Math.exp(-delta * 5);
    camera.position.lerp(a.position, t);
    c.target.lerp(a.target, t);
    c.update();
    if (camera.position.distanceTo(a.position) < 0.02 && c.target.distanceTo(a.target) < 0.02) {
      anim.current = null;
    }
  });

  const { minX, maxX, minZ, maxZ } = model.bounds;
  const span = Math.max(maxX - minX, maxZ - minZ);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={2}
      maxDistance={span * 2.5}
      maxPolarAngle={Math.PI / 2 - 0.03}
      screenSpacePanning
      target={[0, 1.5, 0]}
    />
  );
}
