import { memo, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import type { Zone } from '../domain/types';
import { useStore } from '../state/store';
import { Label } from './Label';
import { SCENE, tintFor } from './palette';
import { DRAG_PX } from './Racks';
import { cartonTexture, crateTexture } from './textures';

export const ZONE_COLORS: Record<Zone['kind'], string> = {
  recepcion: '#0ea5e9',
  wip: '#a855f7',
  expedicion: '#f97316',
  piso: '#64748b',
  moldes: '#78716c',
  servicio: '#0f766e',
  bin: '#15803d',
  calidad: '#dc2626',
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
    if (zone.inRack) return []; // la mercadería está en la estantería, no en el piso
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
      {zone.code === 'PC' && <Desk x={cx} z={cz} />}
      {zone.kind === 'bin' && (
        <mesh position={[cx, 0.42, cz]} castShadow raycast={noRaycast}>
          <boxGeometry args={[zone.w - 0.05, 0.84, zone.d - 0.05]} />
          <meshStandardMaterial color={SCENE.crate} map={crateTexture()} roughness={0.7} />
        </mesh>
      )}
      {zone.inRack && (
        // Cartel colgante, como el de planta: "UBICACIÓN W0-WIP".
        <group position={[cx, 3.1, zone.z0 + 0.05]}>
          <mesh position={[-0.5, 0.55, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.01, 1.1, 0.01]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <mesh position={[0.5, 0.55, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.01, 1.1, 0.01]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
          <Label text="UBICACIÓN" position={[0, 0.18, 0.01]} rotation={[0, Math.PI, 0]} height={0.3} background="#ffffff" />
          <Label text={zone.code === 'W0WIP' ? 'W0-WIP' : zone.code} position={[0, -0.14, 0.01]} rotation={[0, Math.PI, 0]} height={0.34} background="#ffffff" color="#b42318" />
          <Label text="UBICACIÓN" position={[0, 0.18, -0.01]} height={0.3} background="#ffffff" />
          <Label text={zone.code === 'W0WIP' ? 'W0-WIP' : zone.code} position={[0, -0.14, -0.01]} height={0.34} background="#ffffff" color="#b42318" />
        </group>
      )}
      {boxes.map((b) => (
        <mesh key={b.key} position={b.position} castShadow receiveShadow raycast={noRaycast}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} map={cartonTexture()} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
});

/** Escritorio con monitor y silla (puesto de computadora junto a la entrada). */
function Desk({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.74, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[1.15, 0.04, 0.65]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.6} />
      </mesh>
      {[[-0.52, -0.28], [0.52, -0.28], [-0.52, 0.28], [0.52, 0.28]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} position={[dx, 0.37, dz]} raycast={noRaycast}>
          <boxGeometry args={[0.04, 0.74, 0.04]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      ))}
      <mesh position={[0, 1.02, -0.18]} castShadow raycast={noRaycast}>
        <boxGeometry args={[0.55, 0.34, 0.03]} />
        <meshStandardMaterial color="#111827" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.02, -0.163]} raycast={noRaycast}>
        <planeGeometry args={[0.5, 0.29]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      <mesh position={[0, 0.48, 0.55]} raycast={noRaycast}>
        <boxGeometry args={[0.45, 0.08, 0.45]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Rollos de film al costado, como en la foto */}
      {[-0.75, -0.95].map((dx) => (
        <mesh key={dx} position={[dx, 0.25, 0.1]} raycast={noRaycast}>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          <meshStandardMaterial color="#e5e7eb" transparent opacity={0.85} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
