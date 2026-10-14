import { memo, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import type { Zone } from '../domain/types';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE, tintFor } from './palette';
import { DRAG_PX } from './Racks';
import { cartonTexture } from './textures';

export const ZONE_COLORS: Record<Zone['kind'], string> = {
  recepcion: '#0ea5e9',
  wip: '#a855f7',
  expedicion: '#f97316',
  piso: '#64748b',
};

const noRaycast = () => null;

/** Zonas de piso: recepción, WIP, expedición y otras ubicaciones (F1, L1, Q1…). */
export function Zones() {
  const zones = useStore((s) => s.warehouse.zones);
  return (
    <group>
      {zones.map((z) => (
        <ZoneArea key={z.code} zone={z} />
      ))}
    </group>
  );
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const ZoneArea = memo(function ZoneArea({ zone }: { zone: Zone }) {
  const summary = useStore((s) => s.index.byLocation.get(zone.code));
  const mode = useStore((s) => s.colorMode);
  const selected = useStore((s) => s.selection?.kind === 'zone' && s.selection.code === zone.code);
  const hovered = useStore((s) => s.hover?.kind === 'zone' && s.hover.id === zone.code);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const clearHover = useStore((s) => s.clearHover);
  const color = ZONE_COLORS[zone.kind];
  const cx = zone.x0 + zone.w / 2;
  const cz = zone.z0 + zone.d / 2;
  const h = { kind: 'zone' as const, id: zone.code };

  // Bultos dentro de la zona, en grilla.
  const boxes = useMemo(() => {
    const recs = summary?.records ?? [];
    const cols = Math.max(1, Math.floor((zone.w - 0.6) / 1.4));
    const rowsMax = Math.max(1, Math.floor((zone.d - 0.6) / 1.2));
    const tint = summary ? tintFor(summary, mode) : undefined;
    return recs.slice(0, cols * rowsMax).map((r, i) => {
      const c = i % cols;
      const rr = Math.floor(i / cols);
      const height = 0.6 + hash(r.partNumber + i) * 0.8;
      return {
        key: `${r.partNumber}-${i}`,
        position: [zone.x0 + 0.9 + c * 1.4, height / 2 + 0.12, zone.z0 + 0.9 + rr * 1.2] as [number, number, number],
        size: [1.1, height, 0.9] as [number, number, number],
        color: tint ?? (hash(r.partNumber) > 0.6 ? SCENE.cartonAlt : SCENE.carton),
      };
    });
  }, [summary, mode, zone]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, 0.01, cz]}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > DRAG_PX) return;
          select({ kind: 'zone', code: zone.code });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(h);
        }}
        onPointerOut={() => clearHover(h)}
      >
        <planeGeometry args={[zone.w, zone.d]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.45 : hovered ? 0.35 : 0.2} depthWrite={false} />
        <Edges color={selected ? SCENE.selected : color} lineWidth={selected ? 3 : 2} />
      </mesh>
      <Label
        text={`${zone.code} · ${zone.name}`}
        position={[zone.x0 + zone.w - 0.15, 0.02, cz]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        height={Math.min(0.6, zone.d * 0.18)}
        background={color}
        color="#ffffff"
      />
      {boxes.map((b) => (
        <mesh key={b.key} position={b.position} castShadow receiveShadow raycast={noRaycast}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} map={cartonTexture()} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
});
