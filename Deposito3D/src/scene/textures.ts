import * as THREE from 'three';

/** Texturas generadas por código (sin archivos ni descargas), compartidas. */
const cache = new Map<string, THREE.Texture>();

function make(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export const cartonTexture = () =>
  make('carton', 256, 256, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(70,45,10,0.5)';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 256); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke();
    c.strokeRect(2, 2, 252, 252);
    c.fillStyle = 'rgba(120,80,30,0.16)';
    for (const y of [56, 184]) c.fillRect(0, y, 256, 14);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [x, y] of [[20, 80], [148, 80], [20, 208], [148, 208]]) c.fillRect(x, y, 46, 26);
  });

export const kltTexture = () =>
  make('klt', 256, 256, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 256, 256);
    const n = 3, g = 256 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = i * g, y = j * g;
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(x, y, g, 5);
        c.fillStyle = 'rgba(0,0,0,0.15)';
        for (let k = 1; k < 5; k++) c.fillRect(x + 6, y + k * (g / 5), g - 12, 2);
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.fillRect(x + g / 2 - 14, y + g / 2 - 8, 28, 16);
        c.strokeStyle = 'rgba(0,0,0,0.45)';
        c.lineWidth = 3;
        c.strokeRect(x + 1.5, y + 1.5, g - 3, g - 3);
      }
  });

export const crateTexture = () =>
  make('crate', 256, 128, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 10; x < 250; x += 16) for (let y = 18; y < 118; y += 16) c.fillRect(x, y, 9, 9);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(0, 0, 256, 10);
    c.fillStyle = '#fff';
    c.fillRect(96, 40, 64, 40);
  });

export const palletTexture = () =>
  make('pallet', 128, 32, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 128, 32);
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(14, 9, 38, 15);
    c.fillRect(76, 9, 38, 15);
  });

/** Cartel de texto. Devuelve la textura y su relación de aspecto. */
export function textTexture(text: string, color = '#111827', background = '#facc15') {
  const key = `t|${text}|${color}|${background}`;
  const px = 128;
  const measure = document.createElement('canvas').getContext('2d')!;
  const font = `bold ${px * 0.62}px system-ui, Arial, sans-serif`;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width + px * 0.6);
  const tex = make(key, w, px, (c) => {
    c.fillStyle = background;
    c.fillRect(0, 0, w, px);
    c.font = font;
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, px / 2 + px * 0.03);
  });
  return { texture: tex, aspect: w / px };
}

/**
 * Tira de carteles (p. ej. números de módulo a lo largo de una fila) en UNA textura.
 * `items` son posiciones 0..1 a lo largo de la tira.
 */
export function stripTexture(key: string, items: Array<{ t: number; text: string }>, widthPx: number, heightPx = 64) {
  return make(`strip|${key}`, widthPx, heightPx, (c) => {
    c.clearRect(0, 0, widthPx, heightPx);
    c.font = `bold ${heightPx * 0.62}px system-ui, Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const it of items) {
      const x = it.t * widthPx;
      const w = c.measureText(it.text).width + heightPx * 0.5;
      c.fillStyle = '#f8fafc';
      c.fillRect(x - w / 2, 2, w, heightPx - 4);
      c.strokeStyle = '#334155';
      c.lineWidth = 2;
      c.strokeRect(x - w / 2, 2, w, heightPx - 4);
      c.fillStyle = '#0f172a';
      c.fillText(it.text, x, heightPx / 2 + 2);
    }
  });
}
