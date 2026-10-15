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

/** Chapa acanalada de las paredes (nervios verticales). */
export const corrugatedTexture = () => {
  const t = make('chapa', 256, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 16) {
      c.fillStyle = 'rgba(0,0,0,0.1)';
      c.fillRect(x, 0, 5, 64);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(x + 6, 0, 2, 64);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Bloques de hormigón (40 × 20 cm) en hilada trabada: la textura cubre 0,8 × 0,4 m. */
export const blockTexture = () => {
  const t = make('bloques', 256, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = 'rgba(0,0,0,0.38)';
    for (const y of [0, 64]) c.fillRect(0, y, 256, 4);
    for (const x of [0, 128]) c.fillRect(x, 0, 4, 64);
    for (const x of [64, 192]) c.fillRect(x, 64, 4, 64);
    // Textura del bloque (poros).
    for (let i = 0; i < 500; i++) {
      c.fillStyle = `rgba(0,0,0,${0.04 + ((i * 37) % 7) / 100})`;
      c.fillRect((i * 97) % 256, (i * 53) % 128, 2, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Hoja de portón seccional: paneles horizontales, bisagras y una ventanita ovalada. */
export const sectionalDoorTexture = () =>
  make('porton', 256, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(0, y, 256, 3);
      c.fillStyle = 'rgba(0,0,0,0.08)';
      for (let k = 8; k < 32; k += 8) c.fillRect(0, y + k, 256, 1);
      c.fillStyle = 'rgba(40,40,40,0.6)';
      for (const x of [70, 186]) c.fillRect(x, y + 12, 8, 6);
    }
    c.fillStyle = '#1f2937';
    c.beginPath();
    c.ellipse(128, 150, 34, 15, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(148,163,184,0.8)';
    c.beginPath();
    c.ellipse(128, 150, 28, 10, 0, 0, Math.PI * 2);
    c.fill();
  });

/** Chapa de características de la estantería (cartel de cabecera, estilo Mecalux). */
export const specPlateTexture = () =>
  make('chapa-mecalux', 256, 184, (c) => {
    c.fillStyle = '#f1f5f9';
    c.fillRect(0, 0, 256, 184);
    c.fillStyle = '#3b4fa0';
    c.font = 'bold 34px system-ui, Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('MECALUX', 128, 38);
    const bands = ['#facc15', '#3b82f6', '#ef4444', '#ef4444', '#facc15'];
    bands.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(10, 52 + i * 25, 90, 19);
    });
    c.strokeStyle = '#64748b';
    c.lineWidth = 2;
    c.strokeRect(110, 52, 136, 120);
    c.fillStyle = '#334155';
    c.font = 'bold 13px system-ui, Arial, sans-serif';
    c.textAlign = 'left';
    ['800 kg / pallet', '1600 kg / nivel', '8100 kg / módulo', 'L 2300 mm'].forEach((t, i) => c.fillText(t, 116, 74 + i * 26));
  });

/**
 * Costado de la apiladora Hangcha (negra, panel verde de batería de litio, marca y chapa del proveedor).
 * `mirror` para el costado izquierdo, así el panel verde queda siempre del lado del mástil.
 */
export const forkliftSideTexture = (mirror: boolean) =>
  make(`apiladora|${mirror}`, 512, 256, (c) => {
    if (mirror) {
      c.translate(512, 0);
      c.scale(-1, 1);
    }
    c.fillStyle = '#17191b';
    c.fillRect(0, 0, 512, 256);
    // Panel verde de la batería (trapecio con esquinas redondeadas), del lado del mástil.
    const g = c.createLinearGradient(300, 60, 470, 220);
    g.addColorStop(0, '#5ee04f');
    g.addColorStop(1, '#2f9e34');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(310, 70);
    c.lineTo(455, 62);
    c.quadraticCurveTo(478, 62, 480, 86);
    c.lineTo(486, 196);
    c.quadraticCurveTo(486, 214, 466, 216);
    c.lineTo(340, 222);
    c.quadraticCurveTo(318, 222, 314, 202);
    c.closePath();
    c.fill();
    const text = (s: string, x: number, y: number, font: string, color: string) => {
      c.save();
      if (mirror) {
        // El texto no se espeja: se dibuja deshaciendo la inversión alrededor de su posición.
        c.translate(x, 0);
        c.scale(-1, 1);
        c.translate(-x, 0);
      }
      c.font = font;
      c.fillStyle = color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(s, x, y);
      c.restore();
    };
    text('Li-ION', 380, 40, 'bold 30px system-ui, Arial, sans-serif', '#ffffff');
    text('HANGCHA', 150, 205, 'italic 900 52px system-ui, Arial, sans-serif', '#f3f4f6');
    // Chapa del proveedor.
    c.fillStyle = '#f8fafc';
    c.fillRect(60, 90, 150, 56);
    c.strokeStyle = '#b91c1c';
    c.lineWidth = 3;
    c.strokeRect(63, 93, 144, 50);
    text('CARBONE', 135, 112, 'bold 24px system-ui, Arial, sans-serif', '#b91c1c');
    text('AUTOELEVADORES', 135, 134, 'bold 12px system-ui, Arial, sans-serif', '#b91c1c');
  });

/** Leyenda vertical del mástil. */
export const mastBrandTexture = () =>
  make('apiladora|mastil', 64, 384, (c) => {
    c.fillStyle = '#141516';
    c.fillRect(0, 0, 64, 384);
    c.translate(32, 192);
    c.rotate(-Math.PI / 2);
    c.font = 'italic 900 40px system-ui, Arial, sans-serif';
    c.fillStyle = '#e5e7eb';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('HANGCHA', 0, 2);
  });
