/**
 * Base de la PLANTA COMPLETA (fuera del depósito), tomada de dos planos:
 *  - Plano general de la planta (captura del CAD, 19/10/2026). Escala calculada con el depósito:
 *    en la captura el depósito mide 285 px = 46,76 m → 0,1629 m/px. Con esa escala la sala de
 *    materiales da ~39,4 m, que coincide con su plano (39.530 mm): la escala es consistente.
 *  - Plano de la sala de materiales (39.530 × 11.800 mm).
 * Mismo sistema de coordenadas que el depósito (metros; x hacia la derecha del plano, z hacia abajo).
 * Todo lo que no está confirmado en planta figura como "a confirmar".
 */

/** Plano general: píxel de la captura → metros del modelo (anclado al depósito). */
const PX = 0.1629;
const X0_PX = 270; // borde izquierdo del depósito en la captura (pared de recepción, x = -2)
const Y0_PX = 352; // borde superior del depósito (pared detrás de la fila G, z = -0.27)
const gx = (px: number) => -2 + (px - X0_PX) * PX;
const gz = (py: number) => -0.27 + (py - Y0_PX) * PX;

export interface SiteArea {
  id: string;
  name: string;
  /** Rectángulo en metros. */
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
  /** Altura del bloque (0 = solo marcado en el piso). */
  h: number;
  note?: string;
}

const rect = (id: string, name: string, x0: number, y0: number, x1: number, y1: number, color: string, h: number, note?: string): SiteArea => ({
  id,
  name,
  x: gx(x0),
  z: gz(y0),
  w: (x1 - x0) * PX,
  d: (y1 - y0) * PX,
  color,
  h,
  note,
});

/** Contorno de la nave principal (para el piso y el perímetro). */
export const PLANT = rect('nave', 'Planta', 215, 68, 1250, 445, '#9ca3af', 0);

/** Áreas del plano general (bloques bajos con su nombre; se irán detallando de a una). */
export const SITE_AREAS: SiteArea[] = [
  rect('fg', 'Empty racks / Finish goods', 105, 75, 240, 318, '#64748b', 0.3, 'Afuera de la nave, a la izquierda'),
  rect('ensamble', 'Producción / ensamble (a confirmar)', 222, 72, 1245, 160, '#94a3b8', 0.4),
  rect('racks-int', 'Racks intermedios (a confirmar)', 300, 172, 1050, 215, '#a78bfa', 0.6),
  rect('mant', 'Mantenimiento / Matricería', 470, 228, 530, 335, '#78716c', 0.6),
  rect('iny', 'Inyección', 560, 215, 1195, 330, '#bbf7d0', 0.05),
  rect('pt', 'Racks producto terminado / despacho (a confirmar)', 1255, 70, 1405, 330, '#93c5fd', 0.6),
];

/** Inyectoras (verde en el plano): bloques simplificados a lo largo de la nave. */
export const INJECTORS: Array<{ x: number; z: number; w: number; d: number }> = Array.from({ length: 14 }, (_, i) => {
  const cx = 585 + i * 43;
  return { x: gx(cx - 12), z: gz(225), w: 24 * PX, d: 90 * PX };
});

/** Oficina de supervisores: entre el depósito y la sala de materiales. */
export const OFFICE = { x: 44.76, z: -0.27, w: gx(680) - 44.76, d: 13.34, h: 3.2 };

/**
 * Sala de materiales (plano propio, 39.530 × 11.800 mm). Las piezas de adentro se ubican con la
 * captura del plano: 1186 × 362 px → 0,0333 m/px, origen en la esquina superior izquierda de la sala.
 */
export const MATERIALS_ROOM = { x: gx(680), z: -0.27, w: 39.53, d: 11.8 };
const S = 39.53 / 1186;
const mx = (px: number) => MATERIALS_ROOM.x + px * S;
const mz = (py: number) => MATERIALS_ROOM.z + py * S;
const box = (x0: number, y0: number, x1: number, y1: number) => ({ x: mx(x0), z: mz(y0), w: (x1 - x0) * S, d: (y1 - y0) * S });

/** Divide un tramo en n piezas iguales. */
function split(x0: number, y0: number, x1: number, y1: number, n: number, along: 'x' | 'z') {
  return Array.from({ length: n }, (_, i) => {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    return along === 'x'
      ? box(x0 + (x1 - x0) * t0 + 2, y0, x0 + (x1 - x0) * t1 - 2, y1)
      : box(x0, y0 + (y1 - y0) * t0 + 2, x1, y0 + (y1 - y0) * t1 - 2);
  });
}

export const MATERIALS_LAYOUT = {
  /** Jaulas de material contra la pared de arriba y la de la izquierda. */
  cagesMaterial: [...split(80, 8, 310, 48, 6, 'x'), ...split(3, 72, 45, 305, 5, 'z'), ...split(393, 40, 470, 73, 2, 'x')],
  /** Jaulas de tableros (abajo). */
  cagesTablero: [...split(172, 312, 405, 360, 5, 'x'), ...split(425, 293, 540, 320, 3, 'x')],
  /** Tachos (arriba y abajo a la derecha de las jaulas). */
  bins: [...split(378, 15, 490, 35, 4, 'x'), ...split(410, 325, 552, 355, 5, 'x')],
  /** Dos filas de 8 silos con su pasillo. Abajo: SILO 1–8 (izquierda a derecha). */
  silosBottom: split(615, 235, 1000, 290, 8, 'x'),
  silosTop: split(615, 75, 1000, 130, 8, 'x'),
  walkways: [box(557, 58, 1060, 78), box(715, 280, 1000, 305), box(635, 285, 710, 335)],
  /** Recuadro grande de la derecha (equipo a confirmar). */
  machine: box(1083, 22, 1170, 127),
  /** Bloques amarillos de la derecha (bolsas de material, a confirmar). */
  bags: [box(1062, 197, 1158, 235), box(1062, 275, 1158, 318)],
  bagWalkways: [box(1045, 180, 1175, 196), box(1045, 236, 1175, 252), box(1045, 258, 1175, 274), box(1045, 320, 1175, 336)],
};

/** Extensión total del sitio (para cámara y niebla). */
export const SITE_BOUNDS = { minX: gx(100), maxX: gx(1410), minZ: gz(60), maxZ: gz(450) };
