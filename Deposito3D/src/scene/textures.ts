import * as THREE from 'three';

/**
 * Texturas generadas con canvas (sin archivos de imagen ni descargas).
 * Se crean una sola vez y se comparten entre todas las cargas.
 */
const cache = new Map<string, THREE.Texture>();

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
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

/** Cajas de cartón apiladas (2 x 2) con cinta y etiqueta blanca. */
export const cardboardTexture = () =>
  make('carton', 256, 256, (c) => {
    c.fillStyle = '#ffffff'; // el color real lo da el material (permite teñir)
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(70,45,10,0.55)';
    c.lineWidth = 4;
    for (const x of [128]) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke();
    }
    c.beginPath(); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke();
    c.strokeRect(2, 2, 252, 252);
    c.fillStyle = 'rgba(120,80,30,0.18)'; // cinta
    for (const y of [56, 184]) c.fillRect(0, y, 256, 14);
    c.fillStyle = 'rgba(255,255,255,0.95)'; // etiquetas
    for (const [x, y] of [[20, 80], [148, 80], [20, 208], [148, 208]]) c.fillRect(x, y, 46, 26);
  });

/** Cajas plásticas grises tipo KLT en grilla. */
export const kltTexture = () =>
  make('klt', 256, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    const cols = 3, rows = 3, gw = 256 / cols, gh = 256 / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = i * gw, y = j * gh;
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(x, y, gw, 5);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (let k = 1; k < 5; k++) c.fillRect(x + 6, y + k * (gh / 5), gw - 12, 2);
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.fillRect(x + gw / 2 - 14, y + gh / 2 - 8, 28, 16);
        c.strokeStyle = 'rgba(0,0,0,0.5)';
        c.lineWidth = 3;
        c.strokeRect(x + 1.5, y + 1.5, gw - 3, gh - 3);
      }
  });

/** Cajón plástico calado (verde) con etiqueta. */
export const crateTexture = () =>
  make('cajon', 256, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = 10; x < 250; x += 16)
      for (let y = 18; y < 118; y += 16) c.fillRect(x, y, 9, 9);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(0, 0, 256, 10);
    c.fillStyle = '#ffffff';
    c.fillRect(96, 40, 64, 40);
  });

/** Laterales de un pallet: tablas con huecos para la horquilla. */
export const palletTexture = () =>
  make('pallet', 128, 32, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 32);
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(14, 9, 38, 15);
    c.fillRect(76, 9, 38, 15);
  });
