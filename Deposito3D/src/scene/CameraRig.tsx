import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../state/store';
import { WalkControls } from './WalkControls';

interface Segment {
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  duration: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Controles de órbita + animación de cámara por tramos (vuelos y recorridos a pie).
 * Cualquier interacción del usuario cancela la animación.
 */
export function CameraRig() {
  const request = useStore((s) => s.camera);
  const walkMode = useStore((s) => s.walkMode);
  const bounds = useStore((s) => s.warehouse.bounds);
  const camera = useThree((s) => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const queue = useRef<Segment[]>([]);
  const elapsed = useRef(0);

  useEffect(() => {
    const c = controls.current;
    if (!request || !c) return;
    let pos = camera.position.clone();
    let tgt = c.target.clone();
    queue.current = request.path.map((kf) => {
      const toPos = new THREE.Vector3(...kf.position);
      const toTarget = new THREE.Vector3(...kf.target);
      const dist = pos.distanceTo(toPos) + tgt.distanceTo(toTarget) * 0.5;
      const seg = { fromPos: pos, fromTarget: tgt, toPos, toTarget, duration: kf.duration ?? Math.min(2.2, 0.7 + dist / 30) };
      pos = toPos;
      tgt = toTarget;
      return seg;
    });
    elapsed.current = 0;
  }, [request, camera]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (queue.current = []);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, []);

  // Al salir del recorrido, la órbita gira alrededor de lo que se estaba mirando.
  useEffect(() => {
    const c = controls.current;
    if (walkMode || !c) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    if (camera.position.y < 2.5) {
      c.target.copy(camera.position).addScaledVector(dir, 4);
      c.update();
    }
  }, [walkMode, camera]);

  useFrame((_, delta) => {
    const c = controls.current;
    const seg = queue.current[0];
    if (!c || !seg) return;
    // Basado en tiempo real: en PCs lentas la animación saltea cuadros pero dura lo mismo.
    elapsed.current += Math.min(delta, 0.5);
    const t = Math.min(1, elapsed.current / seg.duration);
    const k = ease(t);
    camera.position.lerpVectors(seg.fromPos, seg.toPos, k);
    c.target.lerpVectors(seg.fromTarget, seg.toTarget, k);
    c.update();
    if (t >= 1) {
      queue.current.shift();
      elapsed.current = 0;
    }
  });

  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  return (
    <>
    {walkMode && <WalkControls />}
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!walkMode}
      enableDamping
      dampingFactor={0.1}
      minDistance={0.5}
      maxDistance={span * 2.2}
      maxPolarAngle={Math.PI / 2 - 0.02}
      screenSpacePanning
      target={[(bounds.minX + bounds.maxX) / 2, 1.5, (bounds.minZ + bounds.maxZ) / 2]}
    />
    </>
  );
}
