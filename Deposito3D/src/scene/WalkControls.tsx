import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { walkInput } from './walkInput';

export const EYE_HEIGHT = 1.65;
const SPEED = 3.2;
const RADIUS = 0.35;

/**
 * Recorrido en primera persona: caminar a la altura de los ojos.
 * Teclado: W/S o ↑/↓ avanzar, A/D o ←/→ girar, Q/E paso lateral, Shift correr.
 * Mouse/dedo: arrastrar para mirar. Las estanterías y paredes bloquean el paso.
 */
export function WalkControls() {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const wh = useStore((s) => s.warehouse);
  const setWalkMode = useStore((s) => s.setWalkMode);
  const yaw = useRef(0);
  const pitch = useRef(0);

  // Orientación inicial: la actual de la cámara, a la altura de los ojos.
  useEffect(() => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = 0;
    if (camera.position.y > EYE_HEIGHT + 0.5) {
      // Si venía desde arriba, entra por la cabecera del primer pasillo mirando a lo largo.
      const a = wh.aisles[0];
      camera.position.set(a.x0 + 1.5, EYE_HEIGHT, a.centerZ);
      yaw.current = -Math.PI / 2;
    }
    // Aplicar ya la orientación (el efecto puede ejecutarse dos veces en modo estricto).
    camera.rotation.set(0, yaw.current, 0, 'YXZ');
    camera.updateMatrixWorld();
  }, [camera, wh]);

  // Teclado.
  useEffect(() => {
    const keys = new Set<string>();
    const update = () => {
      walkInput.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      walkInput.turn = (keys.has('a') || keys.has('arrowleft') ? 1 : 0) - (keys.has('d') || keys.has('arrowright') ? 1 : 0);
      walkInput.strafe = (keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0);
      walkInput.run = keys.has('shift');
    };
    const isTyping = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (e.key === 'Escape') return setWalkMode(false);
      keys.add(e.key.toLowerCase());
      update();
      if (e.key.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      update();
    };
    const blur = () => {
      keys.clear();
      update();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      blur();
    };
  }, [setWalkMode]);

  // Mirar arrastrando.
  useEffect(() => {
    let last: { x: number; y: number } | null = null;
    const downH = (e: PointerEvent) => (last = { x: e.clientX, y: e.clientY });
    const moveH = (e: PointerEvent) => {
      if (!last) return;
      yaw.current += (e.clientX - last.x) * 0.0045;
      pitch.current = THREE.MathUtils.clamp(pitch.current + (e.clientY - last.y) * 0.0035, -1.2, 1.2);
      last = { x: e.clientX, y: e.clientY };
    };
    const upH = () => (last = null);
    dom.addEventListener('pointerdown', downH);
    window.addEventListener('pointermove', moveH);
    window.addEventListener('pointerup', upH);
    return () => {
      dom.removeEventListener('pointerdown', downH);
      window.removeEventListener('pointermove', moveH);
      window.removeEventListener('pointerup', upH);
    };
  }, [dom]);

  const blocked = (x: number, z: number) => {
    const b = wh.bounds;
    if (x < b.minX + RADIUS || x > b.maxX - RADIUS || z < b.minZ + RADIUS || z > b.maxZ - RADIUS) return true;
    // Paredes: solo se cruzan por los portones.
    for (const w of layout.walls) {
      const vertical = w.x0 === w.x1;
      const near = vertical ? Math.abs(x - w.x0) < RADIUS + 0.1 : Math.abs(z - w.z0) < RADIUS + 0.1;
      if (!near) continue;
      const along = vertical ? z : x;
      const lo = vertical ? Math.min(w.z0, w.z1) : Math.min(w.x0, w.x1);
      const hi = vertical ? Math.max(w.z0, w.z1) : Math.max(w.x0, w.x1);
      if (along < lo - RADIUS || along > hi + RADIUS) continue;
      const inDoor = layout.doors.some((d) => d.wall === w.id && along > d.from + RADIUS && along < d.to - RADIUS);
      if (!inDoor) return true;
    }
    return wh.rows.some((r) => x > r.x0 - 0.2 - RADIUS && x < r.x1 + 0.2 + RADIUS && z > r.z0 - RADIUS && z < r.z1 + RADIUS);
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    yaw.current += walkInput.turn * 1.8 * dt;
    const speed = SPEED * (walkInput.run ? 2 : 1) * dt;
    const fx = -Math.sin(yaw.current);
    const fz = -Math.cos(yaw.current);
    const dx = (fx * walkInput.forward + -fz * walkInput.strafe) * speed;
    const dz = (fz * walkInput.forward + fx * walkInput.strafe) * speed;
    const p = camera.position;
    // Deslizamiento por eje para no "pegarse" a las estanterías.
    if (!blocked(p.x + dx, p.z)) p.x += dx;
    if (!blocked(p.x, p.z + dz)) p.z += dz;
    p.y = EYE_HEIGHT;
    camera.rotation.set(-pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}
