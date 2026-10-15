import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { layout } from '../config/layout';
import { useStore } from '../state/store';
import { useBoxInstances, type BoxInstance } from './instancing';
import { SCENE, tintFor } from './palette';
import { cartonTexture, crateTexture, kltTexture, palletTexture } from './textures';

const PALLET = { w: 1.2, d: 1.0, h: 0.15 };
const CRATE = { w: 1.2, d: 0.9, h: 0.78 };
const noRaycast = () => null;

type LoadKind = 'carton' | 'plastico' | 'klt' | 'film' | 'cajon';

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

/**
 * Toda la mercadería de las estanterías, dibujada en pocos InstancedMesh
 * (uno por tipo de material) para que funcione fluido con cientos de ubicaciones.
 */
export function Loads() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const mode = useStore((s) => s.colorMode);

  const groups = useMemo(() => {
    const g: Record<'palletWood' | 'palletPlastic' | LoadKind | 'free', BoxInstance[]> = {
      palletWood: [], palletPlastic: [], carton: [], plastico: [], klt: [], film: [], cajon: [], free: [],
    };
    const dim = layout.rack;
    const clear = dim.levelHeight - dim.beamHeight - 0.28;

    for (const loc of wh.locations) {
      const sum = index.byLocation.get(loc.code);
      const [x, , z] = loc.position;
      if (!sum) {
        if (mode === 'ocupacion') {
          g.free.push({ position: [x, loc.baseY + 0.07, z], scale: [dim.bayWidth - 0.3, 0.02, dim.depth - 0.15] });
        }
        continue;
      }
      const tint = tintFor(sum, mode);
      const pallets = sum.records.length > 1 || hash(loc.code) > 0.4 ? 2 : 1;
      for (let i = 0; i < pallets; i++) {
        const rec = sum.records[i % sum.records.length];
        const kind = loc.crate ? 'cajon' : kindFor(rec.partNumber, loc.level);
        const px = pallets === 1 ? x : x + (i === 0 ? 0.66 : -0.66);
        if (kind === 'cajon') {
          g.cajon.push({ position: [px, CRATE.h / 2, z], scale: [CRATE.w, CRATE.h, CRATE.d], color: tint ?? SCENE.crate });
          continue;
        }
        const h = clear * (0.5 + 0.5 * hash(rec.partNumber + loc.code + i));
        const plastic = kind === 'plastico' || kind === 'klt';
        (plastic ? g.palletPlastic : g.palletWood).push({
          position: [px, loc.baseY + PALLET.h / 2, z],
          scale: [PALLET.w, PALLET.h, PALLET.d],
          color: plastic ? SCENE.palletPlastic : SCENE.palletWood,
        });
        const natural =
          kind === 'klt' ? SCENE.klt : kind === 'film' ? SCENE.film : hash(rec.partNumber) > 0.7 ? SCENE.cartonAlt : SCENE.carton;
        g[kind].push({
          position: [px, loc.baseY + PALLET.h + h / 2, z],
          scale: [PALLET.w - 0.06, h, PALLET.d - 0.06],
          color: tint ?? natural,
        });
      }
    }
    return g;
  }, [wh, index, mode]);

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
