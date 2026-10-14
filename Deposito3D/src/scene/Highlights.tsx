import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Edges } from '@react-three/drei';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import type { Warehouse } from '../domain/types';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE } from './palette';

const noRaycast = () => null;

function boxFor(wh: Warehouse, code: string) {
  const loc = wh.locationIndex.get(code);
  if (!loc) return null;
  const d = layout.rack;
  const h = d.levelHeight - d.beamHeight - 0.04;
  return {
    position: [loc.position[0], loc.baseY + h / 2 + 0.02, loc.position[2]] as [number, number, number],
    size: [d.bayWidth - d.uprightSize * 2 - 0.02, h, d.depth + 0.02] as [number, number, number],
    facing: loc.facing,
  };
}

/** Resaltado de ubicación (hover / selección) y marcadores de búsqueda por pieza. */
export function Highlights() {
  const wh = useStore((s) => s.warehouse);
  const hover = useStore((s) => s.hover);
  const selection = useStore((s) => s.selection);
  const index = useStore((s) => s.index);

  const hoverBox = hover?.kind === 'location' ? boxFor(wh, hover.id) : null;
  const selBox = selection?.kind === 'location' ? boxFor(wh, selection.code) : null;

  const part = selection?.kind === 'part' ? index.byPart.get(selection.partNumber) : undefined;

  return (
    <group>
      {hoverBox && (!selBox || hover?.id !== (selection as { code: string }).code) && (
        <mesh position={hoverBox.position} raycast={noRaycast}>
          <boxGeometry args={hoverBox.size} />
          <meshBasicMaterial color={SCENE.hover} transparent opacity={0.18} depthWrite={false} />
          <Edges color={SCENE.hover} lineWidth={1.5} />
        </mesh>
      )}
      {selBox && <Pulse position={selBox.position} size={selBox.size} color={SCENE.selected} />}

      {part?.outside.map((rec, i) => {
        const z = wh.zoneIndex.get(rec.location);
        if (!z) return null;
        return (
          <Billboard key={`o-${rec.location}-${i}`} position={[z.x0 + z.w / 2, 2.2 + (i % 3) * 0.45, z.z0 + z.d / 2]}>
            <Label text={`${z.code} · fuera de FIFO`} height={0.3} background="#e2e8f0" position={[0, 0, 0]} />
          </Billboard>
        );
      })}
      {part?.fifo.map((rec, i) => {
        const b = boxFor(wh, rec.location);
        if (b) {
          return (
            <group key={`${rec.location}-${i}`}>
              <Pulse position={b.position} size={b.size} color={SCENE.part} />
              <Billboard position={[b.position[0], b.position[1] + b.size[1] / 2 + 0.35, b.position[2] + b.facing * 0.7]}>
                <Label text={`FIFO ${i + 1}`} height={0.32} background={i === 0 ? '#d946ef' : '#ffffff'} color={i === 0 ? '#ffffff' : '#0f172a'} position={[0, 0, 0]} />
              </Billboard>
            </group>
          );
        }
        const z = wh.zoneIndex.get(rec.location);
        if (!z) return null;
        return (
          <Billboard key={`${rec.location}-${i}`} position={[z.x0 + z.w / 2, 2.6 + (i % 3) * 0.45, z.z0 + z.d / 2]}>
            <Label text={`FIFO ${i + 1} · ${z.code}`} height={0.32} background={i === 0 ? '#d946ef' : '#ffffff'} color={i === 0 ? '#ffffff' : '#0f172a'} position={[0, 0, 0]} />
          </Billboard>
        );
      })}
    </group>
  );
}

/** Caja translúcida que "late" suavemente para llamar la atención. */
function Pulse({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.28 + 0.17 * Math.sin(clock.elapsedTime * 4);
  });
  return (
    <mesh position={position} raycast={noRaycast}>
      <boxGeometry args={size} />
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0.35} depthWrite={false} />
      <Edges color={color} lineWidth={2.5} />
    </mesh>
  );
}
