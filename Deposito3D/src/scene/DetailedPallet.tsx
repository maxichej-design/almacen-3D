import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VISUAL } from '../config/visual';
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
import { crateTexture, kltTexture } from './textures';
import type { PalletVisual } from './Loads';

/*
 * Pallet detallado (modo realista): tablas y tacos del pallet, cajas individuales con cinta y
 * etiqueta, y film stretch envolviendo la carga.
 * Origen: centro de la base. X local = frente de 1,0 m (sobre el larguero), Z local = fondo de 1,2 m.
 *
 * Las piezas se describen como listas de instancias (posición + tamaño + color) para poder juntar
 * TODOS los pallets del depósito en unos pocos InstancedMesh (rendimiento).
 */

export type FilmStyle = 'none' | 'normal' | 'abundante';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const noRaycast = () => null;

export interface Inst {
  p: [number, number, number];
  s: [number, number, number];
  c?: string;
}

/** Tipos de pieza; cada uno se dibuja con un solo InstancedMesh. */
export type PartKey =
  | 'boardsZ'
  | 'boardsX'
  | 'blocks'
  | 'plastic'
  | 'cartonPlain'
  | 'cartonLabeled'
  | 'klt'
  | 'crate'
  | 'filmNormal'
  | 'filmHeavy'
  | 'rolls';

export type Parts = Record<PartKey, Inst[]>;

export const emptyParts = (): Parts => ({
  boardsZ: [],
  boardsX: [],
  blocks: [],
  plastic: [],
  cartonPlain: [],
  cartonLabeled: [],
  klt: [],
  crate: [],
  filmNormal: [],
  filmHeavy: [],
  rolls: [],
});

// ---------------------------------------------------------------- materiales compartidos

let shared: Record<PartKey, THREE.Material | THREE.Material[]> | null = null;

function partMaterials() {
  if (shared) return shared;
  const { color } = woodMaps();
  const woodX = new THREE.MeshStandardMaterial({ map: color, roughness: 0.85 });
  const rot = color.clone();
  rot.center.set(0.5, 0.5);
  rot.rotation = Math.PI / 2;
  rot.needsUpdate = true;
  const woodZ = new THREE.MeshStandardMaterial({ map: rot, roughness: 0.85 });
  const stamp = new THREE.MeshStandardMaterial({ map: blockStampTexture(), roughness: 0.9 });
  const film = (heavy: boolean) => {
    const f = filmMaterial(heavy);
    return [f, f, f, hiddenMaterial(), f, f];
  };
  const crateMat = new THREE.MeshStandardMaterial({ color: SCENE.crate, map: crateTexture(), roughness: 0.65 });
  shared = {
    boardsZ: woodZ,
    boardsX: woodX,
    blocks: [woodX, woodX, woodZ, woodX, stamp, stamp],
    plastic: new THREE.MeshStandardMaterial({ color: SCENE.palletPlastic, roughness: 0.55 }),
    cartonPlain: cartonMaterials().plain,
    cartonLabeled: cartonMaterials().labeled,
    klt: new THREE.MeshStandardMaterial({ map: kltTexture(), roughness: 0.6 }),
    crate: crateMat,
    filmNormal: film(false),
    filmHeavy: film(true),
    rolls: filmRollMaterial(),
  };
  return shared;
}

/** Tonos de cartón kraft (variaciones sutiles entre cajas). */
const KRAFT = ['#b88a52', '#c39660', '#ad7f48', '#c79d68', '#b9895a', '#a87a45'];
/** Variación de tono de las tablas (multiplica la textura de madera). */
const WOOD_TONES = ['#ffffff', '#f2e6d4', '#e8d8bf', '#fff4e2', '#e0cdb0'];

// ---------------------------------------------------------------- pallet

const DECK_T = 0.022;
const BLOCK_H = 0.078;
export const DETAIL_PALLET_H = DECK_T * 3 + BLOCK_H; // 0,144 m

function woodPallet(out: Parts, r: () => number) {
  const tone = () => WOOD_TONES[Math.floor(r() * WOOD_TONES.length)];
  const xs = [-0.45, 0, 0.45];
  const zs = [-0.5275, 0, 0.5275];
  for (const x of xs) out.boardsZ.push({ p: [x, DECK_T / 2, 0], s: [0.1, DECK_T, 1.2], c: tone() });
  for (const x of xs)
    for (const z of zs) out.blocks.push({ p: [x, DECK_T + BLOCK_H / 2, z], s: [0.1, BLOCK_H, 0.145], c: tone() });
  for (const z of zs) out.boardsX.push({ p: [0, DECK_T + BLOCK_H + DECK_T / 2, z], s: [1.0, DECK_T, 0.145], c: tone() });
  for (let i = 0; i < 7; i++) {
    const x = -0.45 + i * 0.15;
    out.boardsZ.push({ p: [x, DECK_T * 2 + BLOCK_H + DECK_T / 2, 0], s: [0.1, DECK_T, 1.2], c: tone() });
  }
}

function plasticPallet(out: Parts) {
  out.plastic.push({ p: [0, DETAIL_PALLET_H - 0.02, 0], s: [1.0, 0.04, 1.2] });
  for (const x of [-0.44, 0, 0.44]) {
    out.plastic.push({ p: [x, 0.012, 0], s: [0.12, 0.024, 1.2] });
    for (const z of [-0.52, 0, 0.52]) out.plastic.push({ p: [x, 0.06, z], s: [0.12, 0.08, 0.16] });
  }
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
/** Cajas plásticas tipo KLT (gris), apiladas. */
const KLT_SIZE: [number, number, number] = [0.3, 0.215, 0.4];

/** Arma la carga en cajas; devuelve la caja envolvente (para el film). */
function boxesLoad(out: Parts, r: () => number, seed: number, targetH: number, tint: string | null, klt: boolean) {
  const [cw, ch, cd] = klt ? KLT_SIZE : CARTON_SIZES[seed % CARTON_SIZES.length];
  const nx = Math.max(1, Math.floor(0.98 / cw));
  const nz = Math.max(1, Math.floor(1.18 / cd));
  const layers = Math.max(1, Math.round(targetH / ch));
  const gap = klt ? 0.004 : 0.006;
  const w = nx * cw + (nx - 1) * gap;
  const d = nz * cd + (nz - 1) * gap;
  // La última capa puede venir incompleta (pallet a medio consumir).
  const lastFill = r() < 0.35 ? 0.4 + r() * 0.5 : 1;
  for (let l = 0; l < layers; l++) {
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++) {
        if (l === layers - 1 && lastFill < 1 && r() > lastFill) continue;
        const jx = (r() - 0.5) * 0.008;
        const jz = (r() - 0.5) * 0.008;
        const inst: Inst = {
          p: [-w / 2 + cw / 2 + i * (cw + gap) + jx, DETAIL_PALLET_H + ch / 2 + l * ch, -d / 2 + cd / 2 + k * (cd + gap) + jz],
          s: [cw - 0.003, ch - 0.003, cd - 0.003],
          c: tint ?? (klt ? '#ffffff' : KRAFT[Math.floor(r() * KRAFT.length)]),
        };
        if (klt) out.klt.push(inst);
        else (r() < 0.3 ? out.cartonLabeled : out.cartonPlain).push(inst);
      }
  }
  return { w, d, h: layers * ch };
}

// ---------------------------------------------------------------- film

function film(out: Parts, r: () => number, w: number, d: number, h: number, style: FilmStyle) {
  if (style === 'none') return;
  const heavy = style === 'abundante';
  // El film baja hasta abrazar las tablas de arriba del pallet.
  const y0 = DETAIL_PALLET_H - 0.05;
  const top = DETAIL_PALLET_H + h + 0.006;
  const fh = top - y0;
  const pad = 0.008;
  out.filmNormal.push({ p: [0, y0 + fh / 2, 0], s: [w + pad * 2, fh, d + pad * 2] });
  if (!heavy) return;
  out.filmHeavy.push({ p: [0, y0 + fh / 2 - 0.004, 0], s: [w + pad * 2 + 0.012, fh - 0.006, d + pad * 2 + 0.012] });
  // Acumulaciones de film: cordón en el borde de arriba y en la base.
  const rr = 0.018;
  for (const yy of [top - 0.01, y0 + 0.025 + r() * 0.03]) {
    out.rolls.push({ p: [0, yy, d / 2 + pad + rr / 2], s: [w + 0.03, rr, rr] });
    out.rolls.push({ p: [0, yy, -d / 2 - pad - rr / 2], s: [w + 0.03, rr, rr] });
    out.rolls.push({ p: [w / 2 + pad + rr / 2, yy, 0], s: [rr, rr, d + 0.03] });
    out.rolls.push({ p: [-w / 2 - pad - rr / 2, yy, 0], s: [rr, rr, d + 0.03] });
  }
}

/** Qué film lleva un pallet (configurable en config/visual.ts; siempre igual para el mismo pallet). */
export function filmFor(kind: string, seedKey: string): FilmStyle {
  const r = rng(hashStr(seedKey) ^ 0x9e3779b9);
  if (r() >= (VISUAL.filmShare[kind] ?? 0)) return 'none';
  return r() < VISUAL.heavyFilmShare ? 'abundante' : 'normal';
}

/**
 * Agrega las piezas de un pallet a `out`, desplazadas a `at` (centro de la base en el mundo).
 * El pallet queda con el frente de 1,0 m sobre X.
 */
export function addPallet(
  out: Parts,
  v: PalletVisual,
  seedKey: string,
  filmStyle: FilmStyle,
  tint: string | null,
  at: [number, number, number] = [0, 0, 0],
) {
  const seed = hashStr(seedKey);
  const r = rng(seed);
  const local = emptyParts();
  if (v.kind === 'cajon') {
    // Cajón plástico verde calado (sin pallet).
    local.crate.push({ p: [0, 0.39, 0], s: [1.0, 0.78, 1.2], c: tint ?? '#ffffff' });
  } else {
    if (v.pallet === 'plastic') plasticPallet(local);
    else woodPallet(local, r);
    const load = boxesLoad(local, r, seed, v.loadH, tint, v.kind === 'klt');
    film(local, r, load.w, load.d, load.h, filmStyle);
  }
  for (const k of Object.keys(local) as PartKey[]) {
    for (const it of local[k]) out[k].push({ ...it, p: [it.p[0] + at[0], it.p[1] + at[1], it.p[2] + at[2]] });
  }
}

// ---------------------------------------------------------------- dibujo

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v3 = new THREE.Vector3();
const sc = new THREE.Vector3();
const col = new THREE.Color();

function Instances({ items, part }: { items: Inst[]; part: PartKey }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      m4.compose(v3.set(...it.p), q, sc.set(...it.s));
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, col.set(it.c ?? '#ffffff'));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  const transparent = part === 'filmNormal' || part === 'filmHeavy' || part === 'rolls';
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[unitBox, partMaterials()[part], Math.max(1, items.length)]}
      castShadow={!transparent}
      receiveShadow
      renderOrder={part === 'filmHeavy' ? 4 : transparent ? 3 : 0}
      raycast={noRaycast}
    />
  );
}

/** Dibuja un conjunto de piezas (de uno o de cientos de pallets) con un InstancedMesh por tipo. */
export function PartsMeshes({ parts }: { parts: Parts }) {
  return (
    <group>
      {(Object.keys(parts) as PartKey[]).map((k) =>
        parts[k].length > 0 ? <Instances key={k} part={k} items={parts[k]} /> : null,
      )}
    </group>
  );
}

interface Props {
  visual: PalletVisual;
  /** Texto para que la disposición sea siempre la misma para el mismo pallet. */
  seedKey: string;
  film: FilmStyle;
  /** Color de la carga cuando la vista colorea por clase, antigüedad, etc. (null = natural). */
  tint: string | null;
}

/** Un pallet suelto (el que lleva la apiladora o el que queda en el piso). */
export function DetailedPallet({ visual, seedKey, film: filmStyle, tint }: Props) {
  const parts = useMemo(() => {
    const p = emptyParts();
    addPallet(p, visual, seedKey, filmStyle, tint);
    return p;
  }, [visual, seedKey, filmStyle, tint]);
  return <PartsMeshes parts={parts} />;
}
