import { useLayoutEffect, type RefObject } from 'react';
import * as THREE from 'three';

export interface BoxInstance {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

/** Carga posiciones/escalas/colores en un InstancedMesh de caja unitaria. */
export function useBoxInstances(ref: RefObject<THREE.InstancedMesh | null>, items: BoxInstance[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      p.set(...it.position);
      s.set(...it.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (it.color) mesh.setColorAt(i, c.set(it.color));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [ref, items]);
}
