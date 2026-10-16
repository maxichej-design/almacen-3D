import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE } from './palette';
import {
  blockStampTexture,
  cartonMaterials,
  filmMaterial,
  filmRollMaterial,
  hashStr,
  hiddenMaterial,
  rng,
  woodMaps,
} from './pbr';
import { kltTexture } from './textures';
import type { PalletVisual } from './Loads';

/*
 * Pallet detallado (modo realista): tablas y tacos del pallet, cajas individuales con cinta y
 * etiqueta, y film stretch envolviendo la carga.
 * Origen: centro de la base. X local = frente de 1,0 m (sobre el larguero), Z local = fondo de 1,2 m.
 */

export type FilmStyle = 'none' | 'normal' | 'abundante';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const noRaycast = () => null;

interface Inst {
  p: [number, number, number];
  s: [number, number, number];
  c?: string;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();
const col = new THREE.Color();

function Instances({ items, material, castShadow = true }: { items: Inst[]; material: THREE.Material | THREE.Material[]; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      m4.compose(v.set(...it.p), q, sc.set(...it.s));
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, col.set(it.c ?? '#ffffff'));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[unitBox, material, Math.max(1, items.length)]}
      castShadow={castShadow}
      receiveShadow
      raycast={noRaycast}
    />
  );
}

// ---------------------------------------------------------------- materiales compartidos

const mats = {
  woodX: null as THREE.MeshStandardMaterial | null,
  woodZ: null as THREE.MeshStandardMaterial | null,
  block: null as THREE.Material[] | null,
  plastic: null as THREE.MeshStandardMaterial | null,
  klt: null as THREE.MeshStandardMaterial | null,
};

function woodMaterials() {
  if (!mats.woodX) {
    const { color } = woodMaps();
    mats.woodX = new THREE.MeshStandardMaterial({ map: color, roughness: 0.85 });
    const rot = color.clone();
    rot.center.set(0.5, 0.5);
    rot.rotation = Math.PI / 2;
    rot.needsUpdate = true;
    mats.woodZ = new THREE.MeshStandardMaterial({ map: rot, roughness: 0.85 });
    const stamp = new THREE.MeshStandardMaterial({ map: blockStampTexture(), roughness: 0.9 });
    mats.block = [mats.woodX, mats.woodX, mats.woodZ, mats.woodX, stamp, stamp];
  }
  return { x: mats.woodX!, z: mats.woodZ!, block: mats.block! };
}

function plasticMaterial() {
  return (mats.plastic ??= new THREE.MeshStandardMaterial({ color: SCENE.palletPlastic, roughness: 0.55, metalness: 0 }));
}

function kltMaterial() {
  return (mats.klt ??= new THREE.MeshStandardMaterial({ map: kltTexture(), roughness: 0.6 }));
}

/** Tonos de cartón kraft (variaciones sutiles entre cajas). */
const KRAFT = ['#b88a52', '#c39660', '#ad7f48', '#c79d68', '#b9895a', '#a87a45'];

// ---------------------------------------------------------------- geometría del pallet

const DECK_T = 0.022;
const BLOCK_H = 0.078;
export const DETAIL_PALLET_H = DECK_T * 3 + BLOCK_H; // 0,144 m

function woodPallet(seed: number) {
  const r = rng(seed);
  const tone = () => KRAFT_WOOD[Math.floor(r() * KRAFT_WOOD.length)];
  const boardsZ: Inst[] = [];
  const boardsX: Inst[] = [];
  const blocks: Inst[] = [];
  const xs = [-0.45, 0, 0.45];
  const zs = [-0.5275, 0, 0.5275];
  // Tablas de abajo (a lo largo de 1,2 m).
  for (const x of xs) boardsZ.push({ p: [x, DECK_T / 2, 0], s: [0.1, DECK_T, 1.2], c: tone() });
  // Tacos.
  for (const x of xs)
    for (const z of zs) blocks.push({ p: [x, DECK_T + BLOCK_H / 2, z], s: [0.1, BLOCK_H, 0.145], c: tone() });
  // Travesaños sobre los tacos (a lo largo de 1,0 m).
  for (const z of zs) boardsX.push({ p: [0, DECK_T + BLOCK_H + DECK_T / 2, z], s: [1.0, DECK_T, 0.145], c: tone() });
  // Tablas de arriba con separaciones.
  for (let i = 0; i < 7; i++) {
    const x = -0.45 + i * 0.15;
    boardsZ.push({ p: [x, DECK_T * 2 + BLOCK_H + DECK_T / 2, 0], s: [0.1, DECK_T, 1.2], c: tone() });
  }
  return { boardsZ, boardsX, blocks };
}

const KRAFT_WOOD = ['#ffffff', '#f2e6d4', '#e8d8bf', '#fff4e2', '#e0cdb0'];

function plasticPallet() {
  const parts: Inst[] = [];
  parts.push({ p: [0, DETAIL_PALLET_H - 0.02, 0], s: [1.0, 0.04, 1.2] });
  for (const x of [-0.44, 0, 0.44]) {
    parts.push({ p: [x, 0.012, 0], s: [0.12, 0.024, 1.2] });
    for (const z of [-0.52, 0, 0.52]) parts.push({ p: [x, 0.06, z], s: [0.12, 0.08, 0.16] });
  }
  return parts;
}

// ---------------------------------------------------------------- carga

/** Tamaños de caja posibles (frente × alto × fondo), según la pieza. */
const CARTON_SIZES: Array<[number, number, number]> = [
  [0.4, 0.28, 0.3],
  [0.5, 0.32, 0.4],
  [0.33, 0.22, 0.3],
  [0.5, 0.36, 0.6],
  [0.25, 0.2, 0.3],
];

interface LoadLayout {
  boxes: Inst[];
  /** Cajas con etiqueta a la vista (no todas la tienen). */
  labeled: Inst[];
  /** Caja envolvente de la carga (para el film). */
  w: number;
  d: number;
  h: number;
}

function cartonLoad(seed: number, targetH: number, tint: string | null, kraft: boolean): LoadLayout {
  const r = rng(seed);
  const [cw, ch, cd] = CARTON_SIZES[seed % CARTON_SIZES.length];
  const nx = Math.max(1, Math.floor(0.98 / cw));
  const nz = Math.max(1, Math.floor(1.18 / cd));
  const layers = Math.max(1, Math.round(targetH / ch));
  const gap = 0.006;
  const w = nx * cw + (nx - 1) * gap;
  const d = nz * cd + (nz - 1) * gap;
  // La última capa puede venir incompleta (pallet a medio consumir).
  const lastFill = r() < 0.35 ? 0.4 + r() * 0.5 : 1;
  const boxes: Inst[] = [];
  const labeled: Inst[] = [];
  for (let l = 0; l < layers; l++) {
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        if (l === layers - 1 && lastFill < 1 && r() > lastFill) continue;
        const jx = (r() - 0.5) * 0.008;
        const jz = (r() - 0.5) * 0.008;
        (r() < 0.3 ? labeled : boxes).push({
          p: [-w / 2 + cw / 2 + i * (cw + gap) + jx, DETAIL_PALLET_H + ch / 2 + l * ch, -d / 2 + cd / 2 + k * (cd + gap) + jz],
          s: [cw - 0.003, ch - 0.003, cd - 0.003],
          c: tint ?? (kraft ? KRAFT[Math.floor(r() * KRAFT.length)] : '#9aa3ad'),
        });
      }
  }
  return { boxes, labeled, w, d, h: layers * ch };
}

// ---------------------------------------------------------------- film

function filmFaceMaterials(heavy: boolean) {
  const f = filmMaterial(heavy);
  return [f, f, f, hiddenMaterial(), f, f];
}

function Film({ w, d, h, style, seed }: { w: number; d: number; h: number; style: FilmStyle; seed: number }) {
  const r = useMemo(() => rng(seed), [seed]);
  if (style === 'none') return null;
  const heavy = style === 'abundante';
  // El film baja hasta abrazar las tablas de arriba del pallet.
  const y0 = DETAIL_PALLET_H - 0.05;
  const top = DETAIL_PALLET_H + h + 0.006;
  const fh = top - y0;
  const pad = 0.008;
  const rolls: Inst[] = [];
  if (heavy) {
    // Acumulaciones de film: cordón en el borde de arriba y en la base, algún pliegue suelto.
    const rr = 0.018;
    for (const yy of [top - 0.01, y0 + 0.025 + r() * 0.03]) {
      rolls.push({ p: [0, yy, d / 2 + pad + rr / 2], s: [w + 0.03, rr, rr] });
      rolls.push({ p: [0, yy, -d / 2 - pad - rr / 2], s: [w + 0.03, rr, rr] });
      rolls.push({ p: [w / 2 + pad + rr / 2, yy, 0], s: [rr, rr, d + 0.03] });
      rolls.push({ p: [-w / 2 - pad - rr / 2, yy, 0], s: [rr, rr, d + 0.03] });
    }
  }
  return (
    <group>
      <mesh
        geometry={unitBox}
        material={filmFaceMaterials(false)}
        position={[0, y0 + fh / 2, 0]}
        scale={[w + pad * 2, fh, d + pad * 2]}
        renderOrder={3}
        raycast={noRaycast}
      />
      {heavy && (
        <mesh
          geometry={unitBox}
          material={filmFaceMaterials(true)}
          position={[0, y0 + fh / 2 - 0.004, 0]}
          scale={[w + pad * 2 + 0.012, fh - 0.006, d + pad * 2 + 0.012]}
          renderOrder={4}
          raycast={noRaycast}
        />
      )}
      {rolls.length > 0 && <Instances items={rolls} material={filmRollMaterial()} castShadow={false} />}
    </group>
  );
}

// ---------------------------------------------------------------- componente

interface Props {
  visual: PalletVisual;
  /** Texto para que la disposición sea siempre la misma para el mismo pallet. */
  seedKey: string;
  film: FilmStyle;
  /** Color de la carga cuando la vista colorea por clase, antigüedad, etc. (null = natural). */
  tint: string | null;
}

export function DetailedPallet({ visual, seedKey, film, tint }: Props) {
  const seed = hashStr(seedKey);
  const pallet = useMemo(() => (visual.pallet === 'wood' ? woodPallet(seed) : null), [visual.pallet, seed]);
  const plastic = useMemo(() => (visual.pallet === 'plastic' ? plasticPallet() : null), [visual.pallet]);
  const load = useMemo(
    () => cartonLoad(seed, visual.loadH, tint, visual.kind !== 'klt'),
    [seed, visual.loadH, visual.kind, tint],
  );
  const wood = pallet ? woodMaterials() : null;

  return (
    <group>
      {pallet && wood && (
        <>
          <Instances items={pallet.boardsZ} material={wood.z} />
          <Instances items={pallet.boardsX} material={wood.x} />
          <Instances items={pallet.blocks} material={wood.block} />
        </>
      )}
      {plastic && <Instances items={plastic} material={plasticMaterial()} />}
      {visual.kind === 'klt' ? (
        <Instances items={[...load.boxes, ...load.labeled]} material={kltMaterial()} />
      ) : (
        <>
          <Instances items={load.boxes} material={cartonMaterials().plain} />
          {load.labeled.length > 0 && <Instances items={load.labeled} material={cartonMaterials().labeled} />}
        </>
      )}
      <Film w={load.w} d={load.d} h={load.h} style={film} seed={seed} />
    </group>
  );
}
