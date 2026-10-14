import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { useBoxInstances, type BoxInstance } from './instancing';
import { DRAG_PX } from './Racks';

/**
 * Volúmenes invisibles de todas las ubicaciones (un solo InstancedMesh).
 * Reciben el mouse: pasar por encima resalta, clic selecciona.
 */
export function LocationPicker() {
  const wh = useStore((s) => s.warehouse);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const clearHover = useStore((s) => s.clearHover);
  const ref = useRef<THREE.InstancedMesh>(null);

  const items = useMemo<BoxInstance[]>(() => {
    const d = layout.rack;
    const w = d.bayWidth - d.uprightSize * 2 - 0.04;
    const h = d.levelHeight - d.beamHeight - 0.06;
    return wh.locations.map((l) => ({
      position: [l.position[0], l.baseY + h / 2 + 0.02, l.position[2]],
      scale: [w, h, d.depth],
    }));
  }, [wh]);
  useBoxInstances(ref, items);

  const codeOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    e.instanceId == null ? null : wh.locations[e.instanceId]?.code ?? null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      onPointerMove={(e) => {
        e.stopPropagation();
        const code = codeOf(e);
        const cur = useStore.getState().hover;
        if (code && (cur?.kind !== 'location' || cur.id !== code)) setHover({ kind: 'location', id: code });
      }}
      onPointerOut={() => {
        const cur = useStore.getState().hover;
        if (cur?.kind === 'location') clearHover(cur);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > DRAG_PX) return;
        const code = codeOf(e);
        if (code) select({ kind: 'location', code });
      }}
    >
      <boxGeometry />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </instancedMesh>
  );
}
