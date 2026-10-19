import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { QUALITY } from '../config/visual';
import type { ColorMode, RackLocation } from '../domain/types';
import { addPallet, emptyParts, filmFor, PartsMeshes } from './DetailedPallet';
import type { LocationSummary } from '../domain/inventory';
import { useBoxInstances, type BoxInstance } from './instancing';
import { SCENE, tintFor } from './palette';
import { cartonTexture, crateTexture, kltTexture, palletTexture } from './textures';

// Pallet IRAM 10016: 1,0 m de frente (sobre el larguero) × 1,2 m de fondo; carga hasta 1,1 m.
const PALLET = { w: 1.0, d: 1.2, h: 0.14 };
const CRATE = { w: 1.0, d: 1.2, h: 0.78 };
const noRaycast = () => null;

export type LoadKind = 'carton' | 'plastico' | 'klt' | 'film' | 'cajon';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** El tipo de embalaje se deduce del número de parte (siempre igual para la misma pieza). */
function kindFor(pn: string, level: number): LoadKind {
  const r = hash(pn);
  if (level === 1 && r < 0.18) return 'cajon';
  return r < 0.45 ? 'carton' : r < 0.62 ? 'plastico' : r < 0.82 ? 'klt' : 'film';
}

/** Cómo se ve un pallet de una ubicación (se usa en la estantería y en la apiladora). */
export interface PalletVisual {
  slot: number;
  /** Centro en X (mundo) dentro del módulo. */
  x: number;
  kind: LoadKind;
  /** Altura de la carga (sin el pallet). */
  loadH: number;
  pallet: 'wood' | 'plastic' | null;
  loadColor: string;
}

export function palletVisuals(loc: RackLocation, sum: LocationSummary, mode: ColorMode): PalletVisual[] {
  const dim = layout.rack;
  const clear = dim.levelHeight - dim.beamHeight - 0.28;
  const tint = tintFor(sum, mode);
  const x = loc.position[0];
  const half = loc.size[0] < dim.bayWidth * 0.75; // medio módulo: entra un solo pallet
  // Un pallet por tarima (máximo 2 por nivel de módulo); sin número de tarima, se estima.
  const tarimas = [...new Set(sum.records.map((r) => r.ref).filter(Boolean))];
  const pallets = half ? 1 : tarimas.length ? Math.min(2, tarimas.length) : sum.records.length > 1 || hash(loc.code) > 0.4 ? 2 : 1;
  const out: PalletVisual[] = [];
  for (let i = 0; i < pallets; i++) {
    const rec = (tarimas.length ? sum.records.find((r) => r.ref === tarimas[i]) : undefined) ?? sum.records[i % sum.records.length];
    const kind = loc.crate ? 'cajon' : kindFor(rec.partNumber, loc.level);
    const px = pallets === 1 ? x : x + (i === 0 ? 0.57 : -0.57);
    if (kind === 'cajon') {
      out.push({ slot: i, x: px, kind, loadH: CRATE.h, pallet: null, loadColor: tint ?? SCENE.crate });
      continue;
    }
    const natural =
      kind === 'klt' ? SCENE.klt : kind === 'film' ? SCENE.film : hash(rec.partNumber) > 0.7 ? SCENE.cartonAlt : SCENE.carton;
    out.push({
      slot: i,
      x: px,
      kind,
      loadH: clear * (0.5 + 0.5 * hash(rec.partNumber + loc.code + i)),
      pallet: kind === 'plastico' || kind === 'klt' ? 'plastic' : 'wood',
      loadColor: tint ?? natural,
    });
  }
  return out;
}

export { PALLET, CRATE };

/**
 * Toda la mercadería de las estanterías, dibujada en pocos InstancedMesh
 * (uno por tipo de material) para que funcione fluido con cientos de ubicaciones.
 */
export function Loads() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const mode = useStore((s) => s.colorMode);
  // Pallet que sacó la apiladora: no se dibuja en la estantería.
  const lifted = useStore((s) => s.forklift.lifted);
  const detailed = useStore((s) => QUALITY[s.quality].detailedLoads);

  const groups = useMemo(() => {
    if (detailed) return null;
    const g: Record<'palletWood' | 'palletPlastic' | LoadKind | 'free', BoxInstance[]> = {
      palletWood: [], palletPlastic: [], carton: [], plastico: [], klt: [], film: [], cajon: [], free: [],
    };
    const dim = layout.rack;

    for (const loc of wh.locations) {
      const sum = index.byLocation.get(loc.code);
      const [, , z] = loc.position;
      if (!sum) {
        if (mode === 'ocupacion') {
          g.free.push({ position: [loc.position[0], loc.baseY + 0.07, z], scale: [loc.size[0] - 0.3, 0.02, dim.depth - 0.15] });
        }
        continue;
      }
      for (const v of palletVisuals(loc, sum, mode)) {
        if (lifted && lifted.code === loc.code && lifted.slot === v.slot) continue;
        if (v.kind === 'cajon') {
          g.cajon.push({ position: [v.x, loc.baseY + CRATE.h / 2, z], scale: [CRATE.w, CRATE.h, CRATE.d], color: v.loadColor });
          continue;
        }
        (v.pallet === 'plastic' ? g.palletPlastic : g.palletWood).push({
          position: [v.x, loc.baseY + PALLET.h / 2, z],
          scale: [PALLET.w, PALLET.h, PALLET.d],
          color: v.pallet === 'plastic' ? SCENE.palletPlastic : SCENE.palletWood,
        });
        g[v.kind].push({
          position: [v.x, loc.baseY + PALLET.h + v.loadH / 2, z],
          scale: [PALLET.w - 0.06, v.loadH, PALLET.d - 0.06],
          color: v.loadColor,
        });
      }
    }
    return g;
  }, [wh, index, mode, lifted, detailed]);

  if (detailed || !groups) return <RealisticLoads />;
  return (
    <group>
      <Instanced items={groups.palletWood} map={palletTexture()} roughness={0.9} />
      <Instanced items={groups.palletPlastic} map={palletTexture()} roughness={0.5} />
      <Instanced items={groups.carton} map={cartonTexture()} roughness={0.85} />
      <Instanced items={groups.plastico} map={cartonTexture()} roughness={0.85} />
      <Instanced items={groups.klt} map={kltTexture()} roughness={0.6} />
      <Instanced items={groups.film} map={cartonTexture()} roughness={0.35} />
      <Instanced items={groups.cajon} map={crateTexture()} roughness={0.7} />
      {groups.free.length > 0 && <Instanced items={groups.free} flatColor={SCENE.free} opacity={0.35} />}
    </group>
  );
}

/**
 * Modo realista: todos los pallets con tablas, cajas individuales y film, juntados en pocos
 * InstancedMesh (uno por tipo de pieza) para que el recorrido siga fluido.
 */
function RealisticLoads() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const mode = useStore((s) => s.colorMode);
  const lifted = useStore((s) => s.forklift.lifted);
  const parts = useMemo(() => {
    const out = emptyParts();
    for (const loc of wh.locations) {
      const sum = index.byLocation.get(loc.code);
      if (!sum) continue;
      const tint = tintFor(sum, mode) ?? null;
      for (const v of palletVisuals(loc, sum, mode)) {
        if (lifted && lifted.code === loc.code && lifted.slot === v.slot) continue;
        const key = `${loc.code}#${v.slot}`;
        addPallet(out, v, key, filmFor(v.kind, key), tint, [v.x, loc.baseY, loc.position[2]]);
      }
    }
    return out;
  }, [wh, index, mode, lifted]);
  return <PartsMeshes parts={parts} />;
}

function Instanced({
  items,
  map,
  roughness = 0.8,
  flatColor,
  opacity,
}: {
  items: BoxInstance[];
  map?: THREE.Texture;
  roughness?: number;
  flatColor?: string;
  opacity?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useBoxInstances(ref, items);
  // La capacidad se fija al crear el mesh: se recrea si crece (key).
  const capacity = Math.max(1, items.length);
  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[undefined, undefined, capacity]}
      castShadow={!flatColor}
      receiveShadow
      raycast={noRaycast}
    >
      <boxGeometry />
      {flatColor ? (
        <meshBasicMaterial color={flatColor} transparent opacity={opacity ?? 1} depthWrite={false} />
      ) : (
        <meshStandardMaterial color="#ffffff" map={map} roughness={roughness} />
      )}
    </instancedMesh>
  );
}
