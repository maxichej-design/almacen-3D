import * as THREE from 'three';

/*
 * Texturas y materiales PBR "realistas" generados por código (sin descargas, funcionan offline).
 * Todo se crea una sola vez y se comparte: pocas texturas, pocos materiales.
 */

const cache = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/** Generador pseudoaleatorio determinístico (mismo resultado en cada carga). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, color = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const t = new THREE.CanvasTexture(canvas);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Ruido suave por octavas (manchas grandes + medianas) sobre un canvas, en escala de grises. */
function blotches(c: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number, size: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = size * (0.4 + r());
    const dark = r() > 0.5;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    const a = alpha * (0.3 + r() * 0.7);
    g.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    // Se dibuja también desplazado para que la textura repita sin costuras.
    for (const dx of [-w, 0, w])
      for (const dy of [-h, 0, h]) {
        c.save();
        c.translate(dx, dy);
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        c.restore();
      }
  }
}

function speckle(c: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = r() > 0.5 ? 255 : 0;
    c.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    const s = r() < 0.9 ? 1 : 2;
    c.fillRect(r() * w, r() * h, s, s);
  }
}

// ---------------------------------------------------------------- Piso de hormigón

/** Hormigón llaneado: color (con variaciones suaves, poros y marcas de llana) — repite cada 4 m. */
export const concreteMaps = () =>
  once('concrete', () => {
    const W = 1024;
    const r = rng(7);
    const color = canvasTex(W, W, (c) => {
      c.fillStyle = '#8f9396';
      c.fillRect(0, 0, W, W);
      blotches(c, W, W, r, 60, 260, 0.08);
      blotches(c, W, W, r, 220, 70, 0.06);
      // Marcas circulares de llana.
      c.lineWidth = 1.2;
      for (let i = 0; i < 90; i++) {
        const x = r() * W;
        const y = r() * W;
        c.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`;
        c.beginPath();
        c.arc(x, y, 30 + r() * 90, r() * 6, r() * 6 + 1.2);
        c.stroke();
      }
      speckle(c, W, W, r, 26000, 0.16);
      // Junta de dilatación en el borde (cada 4 m se ve una línea fina).
      c.fillStyle = 'rgba(30,32,34,0.45)';
      c.fillRect(0, 0, W, 3);
      c.fillRect(0, 0, 3, W);
    });
    const r2 = rng(11);
    const rough = canvasTex(
      512,
      512,
      (c) => {
        c.fillStyle = '#9a9a9a';
        c.fillRect(0, 0, 512, 512);
        blotches(c, 512, 512, r2, 80, 90, 0.18);
        speckle(c, 512, 512, r2, 9000, 0.25);
      },
      false,
    );
    return { color, rough };
  });

/**
 * Capa de desgaste de todo el piso (no repite): huellas oscuras de las ruedas por el centro de los pasillos.
 * `tracks` son segmentos en coordenadas 0..1 del rectángulo del piso.
 */
export function wearTexture(key: string, tracks: Array<{ x0: number; y0: number; x1: number; y1: number; w: number }>) {
  return once(`wear|${key}`, () => {
    const W = 2048;
    const H = 1024;
    const r = rng(23);
    return canvasTex(W, H, (c) => {
      c.clearRect(0, 0, W, H);
      for (const t of tracks) {
        const x0 = t.x0 * W;
        const x1 = t.x1 * W;
        const y0 = t.y0 * H;
        const y1 = t.y1 * H;
        const horizontal = Math.abs(x1 - x0) > Math.abs(y1 - y0);
        // Varias pasadas finas y desparejas = marcas de rodado.
        for (let k = 0; k < 14; k++) {
          const off = (r() - 0.5) * t.w * H;
          c.strokeStyle = `rgba(20,22,24,${0.025 + r() * 0.05})`;
          c.lineWidth = 2 + r() * 7;
          c.beginPath();
          if (horizontal) {
            c.moveTo(x0, y0 + off);
            for (let x = x0; x <= x1; x += 60) c.lineTo(x, y0 + off + (r() - 0.5) * 3);
          } else {
            c.moveTo(x0 + off, y0);
            for (let y = y0; y <= y1; y += 60) c.lineTo(x0 + off + (r() - 0.5) * 3, y);
          }
          c.stroke();
        }
      }
      // Alguna mancha de aceite o de goma, discreta.
      for (let i = 0; i < 40; i++) {
        const x = r() * W;
        const y = r() * H;
        const rad = 6 + r() * 26;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(15,15,15,${0.06 + r() * 0.08})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
  });
}

// ---------------------------------------------------------------- Madera del pallet

export const woodMaps = () =>
  once('wood', () => {
    const r = rng(31);
    const color = canvasTex(512, 128, (c) => {
      c.fillStyle = '#c9a26b';
      c.fillRect(0, 0, 512, 128);
      // Vetas a lo largo de la tabla.
      for (let i = 0; i < 70; i++) {
        const y = r() * 128;
        c.strokeStyle = r() > 0.5 ? `rgba(110,70,30,${0.08 + r() * 0.18})` : `rgba(255,235,200,${0.08 + r() * 0.12})`;
        c.lineWidth = 0.6 + r() * 2;
        c.beginPath();
        c.moveTo(0, y);
        for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x / (40 + r() * 60) + i) * (1 + r() * 2));
        c.stroke();
      }
      // Nudos.
      for (let i = 0; i < 3; i++) {
        const x = r() * 512;
        const y = 20 + r() * 88;
        const g = c.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, 'rgba(80,45,15,0.75)');
        g.addColorStop(1, 'rgba(80,45,15,0)');
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2);
        c.fill();
      }
      speckle(c, 512, 128, r, 3000, 0.15);
      // Bordes de la tabla más oscuros (sierra, suciedad).
      const e = c.createLinearGradient(0, 0, 0, 128);
      e.addColorStop(0, 'rgba(60,35,10,0.35)');
      e.addColorStop(0.12, 'rgba(0,0,0,0)');
      e.addColorStop(0.88, 'rgba(0,0,0,0)');
      e.addColorStop(1, 'rgba(60,35,10,0.35)');
      c.fillStyle = e;
      c.fillRect(0, 0, 512, 128);
    });
    return { color };
  });

/** Cara del taco del pallet, con el sello IPPC quemado. */
export const blockStampTexture = () =>
  once('taco', () =>
    canvasTex(128, 96, (c) => {
      c.fillStyle = '#c49a62';
      c.fillRect(0, 0, 128, 96);
      const r = rng(5);
      speckle(c, 128, 96, r, 900, 0.2);
      c.strokeStyle = 'rgba(40,25,10,0.7)';
      c.lineWidth = 2;
      c.strokeRect(24, 24, 80, 48);
      c.fillStyle = 'rgba(40,25,10,0.75)';
      c.font = 'bold 18px Arial, sans-serif';
      c.textAlign = 'center';
      c.fillText('IPPC', 64, 46);
      c.font = 'bold 12px Arial, sans-serif';
      c.fillText('AR-HT', 64, 64);
    }),
  );

// ---------------------------------------------------------------- Cajas de cartón

/** Costado de la caja: cartón kraft con fibras, bordes, cinta que baja por el centro y etiqueta opcional. */
function kraftSide(label: boolean) {
  return canvasTex(256, 256, (c) => {
    const r = rng(label ? 41 : 43);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    blotches(c, 256, 256, r, 25, 60, 0.05);
    // Fibras / ondas del corrugado apenas visibles.
    for (let x = 0; x < 256; x += 4) {
      c.fillStyle = `rgba(90,60,20,${0.015 + r() * 0.02})`;
      c.fillRect(x, 0, 1, 256);
    }
    speckle(c, 256, 256, r, 1800, 0.12);
    // Bordes y pliegues: más oscuros, con el canto un poco aplastado.
    c.strokeStyle = 'rgba(70,45,15,0.45)';
    c.lineWidth = 5;
    c.strokeRect(2, 2, 252, 252);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 2;
    c.strokeRect(7, 7, 242, 242);
    // Solapa superior (línea de pliegue a 1/5 de la altura).
    c.fillStyle = 'rgba(80,50,20,0.18)';
    c.fillRect(0, 44, 256, 2);
    // Cinta de embalaje (marrón translúcida) bajando desde arriba.
    c.fillStyle = 'rgba(170,120,60,0.45)';
    c.fillRect(110, 0, 36, 70);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(112, 0, 4, 70);
    if (label) {
      c.fillStyle = '#f8f8f6';
      c.fillRect(150, 120, 86, 64);
      c.fillStyle = '#c81e1e';
      c.fillRect(150, 120, 86, 9);
      c.fillStyle = 'rgba(20,20,20,0.85)';
      for (let i = 0; i < 4; i++) c.fillRect(156, 136 + i * 8, 40 + ((i * 17) % 30), 3);
      for (let x = 156; x < 230; x += 3) if ((x * 7) % 5 < 3) c.fillRect(x, 168, x % 2 ? 1 : 2, 12);
    }
  });
}

/** Tapa: kraft con la cinta a lo largo y la unión de las solapas. */
function kraftTop() {
  return canvasTex(256, 256, (c) => {
    const r = rng(47);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    blotches(c, 256, 256, r, 25, 60, 0.05);
    speckle(c, 256, 256, r, 1800, 0.12);
    c.strokeStyle = 'rgba(70,45,15,0.45)';
    c.lineWidth = 5;
    c.strokeRect(2, 2, 252, 252);
    c.fillStyle = 'rgba(60,40,15,0.5)';
    c.fillRect(0, 127, 256, 2);
    c.fillStyle = 'rgba(170,120,60,0.45)';
    c.fillRect(0, 110, 256, 36);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(0, 112, 256, 4);
  });
}

/**
 * Materiales de la caja (uno por cara de BoxGeometry: +x, −x, +y, −y, +z, −z).
 * El color de cada caja viene del color de instancia (variaciones sutiles de tono).
 */
export const cartonMaterials = () =>
  once('carton-mats', () => {
    const side = new THREE.MeshStandardMaterial({ map: kraftSide(false), roughness: 0.92, metalness: 0 });
    const labeled = new THREE.MeshStandardMaterial({ map: kraftSide(true), roughness: 0.9, metalness: 0 });
    const top = new THREE.MeshStandardMaterial({ map: kraftTop(), roughness: 0.88, metalness: 0 });
    return {
      plain: [side, side, top, side, side, side],
      labeled: [labeled, side, top, side, labeled, side],
    };
  });

// ---------------------------------------------------------------- Film stretch

/**
 * Film stretch: textura de vueltas superpuestas (bandas inclinadas con bordes más densos),
 * estrías del estiramiento y pliegues. Se usa como alphaMap (cuánto plástico hay) y como bumpMap
 * (relieve de los pliegues, para que los brillos se "rompan" como en el plástico real).
 */
export function filmMaps(heavy: boolean) {
  return once(`film|${heavy}`, () => {
    const W = 512;
    const H = 512;
    const r = rng(heavy ? 61 : 67);
    const draw = (c: CanvasRenderingContext2D, forBump: boolean) => {
      c.fillStyle = forBump ? '#808080' : heavy ? '#4a4a4a' : '#333333';
      c.fillRect(0, 0, W, H);
      const turns = heavy ? 11 : 6;
      for (let i = 0; i < turns; i++) {
        // Cada vuelta: una banda de 50 cm de ancho con poca inclinación.
        const y = (i / turns) * H + (r() - 0.5) * 40;
        const bw = H * (heavy ? 0.3 : 0.26);
        const tilt = (r() - 0.5) * 70;
        c.save();
        c.translate(0, y);
        c.beginPath();
        c.moveTo(-20, 0);
        c.lineTo(W + 20, tilt);
        c.lineTo(W + 20, tilt + bw);
        c.lineTo(-20, bw);
        c.closePath();
        c.fillStyle = forBump ? `rgba(255,255,255,${0.05 + r() * 0.05})` : `rgba(255,255,255,${heavy ? 0.12 : 0.13})`;
        c.fill();
        // Bordes de la banda: el film se enrolla y queda una línea más opaca.
        c.strokeStyle = forBump ? 'rgba(255,255,255,0.6)' : `rgba(255,255,255,${heavy ? 0.55 : 0.45})`;
        c.lineWidth = 2 + r() * 3;
        c.beginPath();
        c.moveTo(-20, 0);
        c.lineTo(W + 20, tilt);
        c.stroke();
        c.restore();
      }
      // Estrías finas del estiramiento (casi horizontales).
      for (let i = 0; i < (heavy ? 260 : 160); i++) {
        const y = r() * H;
        c.strokeStyle = forBump ? `rgba(${r() > 0.5 ? 255 : 0},0,0,0.25)` : `rgba(255,255,255,${0.03 + r() * 0.07})`;
        if (forBump) c.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
        c.lineWidth = 0.5 + r();
        const x0 = r() * W;
        const len = 40 + r() * 220;
        c.beginPath();
        c.moveTo(x0, y);
        c.lineTo(x0 + len, y + (r() - 0.5) * 8);
        c.stroke();
      }
      // Pliegues y arrugas (diagonales cortas), más en el film abundante.
      for (let i = 0; i < (heavy ? 70 : 25); i++) {
        const x = r() * W;
        const y = r() * H;
        const a = (r() - 0.5) * 1.4;
        const len = 20 + r() * 70;
        c.strokeStyle = forBump ? 'rgba(255,255,255,0.7)' : `rgba(255,255,255,${0.12 + r() * 0.2})`;
        c.lineWidth = 1 + r() * 2;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * 12, x + Math.cos(a) * len, y + Math.sin(a) * len);
        c.stroke();
      }
    };
    const alpha = canvasTex(W, H, (c) => draw(c, false), false);
    const bump = canvasTex(W, H, (c) => draw(c, true), false);
    return { alpha, bump };
  });
}

/**
 * Material del film: plástico transparente (no vidrio): poco color, brillo especular fino con
 * clearcoat, rugosidad baja pero no nula. Sin transmission (costosa y con errores de orden);
 * la transparencia se controla con opacidad + alphaMap.
 */
export function filmMaterial(heavy: boolean) {
  return once(`film-mat|${heavy}`, () => {
    const { alpha, bump } = filmMaps(heavy);
    const m = new THREE.MeshPhysicalMaterial({
      color: '#f4f8fb',
      roughness: heavy ? 0.26 : 0.16,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: heavy ? 0.7 : 0.9,
      alphaMap: alpha,
      bumpMap: bump,
      bumpScale: heavy ? 1.6 : 1,
      depthWrite: false,
      envMapIntensity: 1.4,
      specularIntensity: 1,
      side: THREE.FrontSide,
    });
    return m;
  });
}

/** Rollo de film acumulado en los bordes (más opaco). */
export const filmRollMaterial = () =>
  once('film-roll', () =>
    new THREE.MeshPhysicalMaterial({
      color: '#eef3f6',
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      envMapIntensity: 1.3,
    }),
  );

/** Material invisible para la cara de abajo del film (el film no cierra por debajo). */
export const hiddenMaterial = () => once('hidden', () => new THREE.MeshBasicMaterial({ visible: false }));

// ---------------------------------------------------------------- Estanterías (pintura industrial)

/** Rayones y marcas de uso, muy sutiles (escala de grises para multiplicar el color). */
function scuffs(c: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    c.strokeStyle = r() > 0.4 ? `rgba(0,0,0,${0.08 + r() * 0.15})` : `rgba(255,255,255,${0.1 + r() * 0.2})`;
    c.lineWidth = 0.6 + r() * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6);
    c.stroke();
  }
}

/** Parante: perforaciones en dos columnas (cada 5 cm) + rayones. La textura cubre 0,6 m de alto. */
export const uprightMaps = () =>
  once('parante', () => {
    const W = 64;
    const H = 512;
    const r = rng(71);
    const map = canvasTex(W, H, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      // Pliegues del perfil (sombra en los bordes, brillo en el centro).
      const g = c.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.35)');
      g.addColorStop(0.18, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      g.addColorStop(0.82, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      // Perforaciones (ranuras en forma de gota) en dos columnas.
      c.fillStyle = '#0b0f1a';
      for (let y = 6; y < H; y += 42) {
        for (const x of [16, 44]) {
          c.beginPath();
          c.ellipse(x, y + 8, 3.2, 8, 0, 0, Math.PI * 2);
          c.fill();
        }
      }
      scuffs(c, W, H, r, 40);
    });
    map.repeat.set(1, 1);
    return { map };
  });

/** Larguero: perfil escalonado (brillo arriba, sombra abajo), rayones y pequeños saltos de pintura. */
export const beamMaps = () =>
  once('larguero', () => {
    const W = 512;
    const H = 64;
    const r = rng(73);
    const map = canvasTex(W, H, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,0.25)');
      g.addColorStop(0.12, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.45, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.25)');
      g.addColorStop(0.56, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      scuffs(c, W, H, r, 90);
      // Saltos de pintura (metal gris a la vista), pocos.
      for (let i = 0; i < 8; i++) {
        c.fillStyle = 'rgba(80,80,80,0.55)';
        c.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2);
      }
    });
    return { map };
  });

/** Placa de conexión del larguero: ranuras y dos bulones. */
export const connectorMap = () =>
  once('conector', () =>
    canvasTex(64, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 64, 128);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, 0, 4, 128);
      c.fillRect(60, 0, 4, 128);
      c.fillStyle = '#1a1a1a';
      for (const y of [40, 56, 72, 88]) c.fillRect(28, y, 8, 9);
      for (const y of [18, 108]) {
        const g = c.createRadialGradient(32, y, 1, 32, y, 10);
        g.addColorStop(0, '#f1f5f9');
        g.addColorStop(0.6, '#9ca3af');
        g.addColorStop(1, '#4b5563');
        c.fillStyle = g;
        c.beginPath();
        c.arc(32, y, 9, 0, Math.PI * 2);
        c.fill();
      }
    }),
  );
