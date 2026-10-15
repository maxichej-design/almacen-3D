/**
 * Layout físico del depósito, tomado del plano de ingeniería (CAD).
 * Todas las medidas en metros. Origen: esquina superior izquierda del plano
 * (pared izquierda = x 0, pared superior = z 0). X crece hacia la derecha del plano,
 * Z hacia abajo del plano.
 *
 * Nomenclatura de ubicaciones: <Fila><Módulo>.<Nivel>, p. ej. "C5.1".
 * Las LETRAS de cada fila y el sentido de numeración son TENTATIVOS hasta confirmarlos.
 */

export interface RackDimensions {
  /** Ancho de un módulo (2 posiciones de pallet). */
  bayWidth: number;
  depth: number;
  levelHeight: number;
  uprightSize: number;
  beamHeight: number;
}

/** Una fila de estanterías. */
export interface RowConfig {
  id: string;
  /** Pasillo al que mira el frente de la fila. */
  aisle: string;
  /** Inicio del primer módulo (x) y borde trasero/superior (z). */
  x: number;
  z: number;
  modules: number;
  /** +1 = el frente mira hacia abajo del plano (z+), -1 = hacia arriba. */
  facing: 1 | -1;
  /** Huecos sin estantería en los extremos (en el plano, cuadro vacío). */
  emptyStart?: number;
  emptyEnd?: number;
}

/** Pasillo: rectángulo de circulación. */
export interface AisleConfig {
  id: string;
  name: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface ZoneConfig {
  /** Código tal como aparece en el sistema, p. ej. "W0WIP". */
  code: string;
  name: string;
  kind: 'wip' | 'recepcion' | 'expedicion' | 'piso' | 'moldes' | 'servicio';
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Pared recta (horizontal o vertical en el plano). */
export interface WallConfig {
  id: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  height: number;
  /** Pared dibujada baja ("cortada") para poder mirar el depósito desde ese lado. */
  cut?: boolean;
}

/** Portón: tramo de una pared, medido a lo largo de ella (x si es horizontal, z si es vertical). */
export interface DoorConfig {
  name: string;
  wall: string;
  from: number;
  to: number;
}

export interface WarehouseLayout {
  levels: number;
  /** Posiciones de pallet por módulo (dibujo). */
  palletsPerModule: number;
  rack: RackDimensions;
  /** Edificio (estanterías + playa). */
  building: { x0: number; x1: number; z0: number; z1: number };
  /** Interior del depósito (piso epoxi), entre paredes. */
  interior: { x0: number; x1: number; z0: number; z1: number };
  walls: WallConfig[];
  doors: DoorConfig[];
  rows: RowConfig[];
  aisles: AisleConfig[];
  zones: ZoneConfig[];
  wallHeight: number;
}

const BAY = 2.7;
const DEPTH = 1.1;
const EMPTY = 1.2;

export const layout: WarehouseLayout = {
  levels: 6, // el "6" del plano
  palletsPerModule: 2,
  rack: { bayWidth: BAY, depth: DEPTH, levelHeight: 1.4, uprightSize: 0.09, beamHeight: 0.12 },

  // Nombres según el plano completado a mano en planta (15/10/2026).
  rows: [
    // Bloque izquierdo (de arriba hacia abajo del plano)
    { id: 'G', aisle: '1', x: 3.15, z: 0.2, modules: 10, facing: 1, emptyStart: EMPTY, emptyEnd: EMPTY },
    { id: 'F', aisle: '1', x: 3.15, z: 5.9, modules: 11, facing: -1, emptyStart: EMPTY },
    { id: 'E', aisle: '2', x: 3.15, z: 5.9 + DEPTH + 0.2, modules: 11, facing: 1, emptyStart: EMPTY },
    // Fila larga de abajo (cruza los dos bloques)
    { id: 'A', aisle: '2', x: 3.15, z: 12.6, modules: 17, facing: -1, emptyStart: EMPTY, emptyEnd: EMPTY },
    // Bloque derecho: 5 módulos, el 1 del lado del pasillo transversal
    { id: 'D', aisle: '1', x: 36.75, z: 0.8, modules: 5, facing: 1 },
    { id: 'C', aisle: '1', x: 36.75, z: 5.9, modules: 5, facing: -1 },
    { id: 'B', aisle: '2', x: 36.75, z: 5.9 + DEPTH + 0.2, modules: 5, facing: 1 },
  ],

  aisles: [
    { id: '1', name: 'Pasillo 1', x0: 0.4, x1: 50.0, z0: 1.9, z1: 5.9 },
    { id: '2', name: 'Pasillo 2', x0: 0.4, x1: 50.0, z0: 8.3, z1: 12.6 },
    { id: 'T', name: 'Pasillo transversal', x0: 33, x1: 36.75, z0: 1.9, z1: 12.6 },
  ],

  // Paredes: izquierda con dos portones; la fila A llega hasta la pared derecha;
  // ~1 m detrás de la A y ~0,5 m detrás de la G (esa se dibuja baja para poder mirar desde ahí).
  interior: { x0: 0, x1: 50.35, z0: -0.3, z1: 14.7 },
  walls: [
    { id: 'izquierda', x0: 0, z0: -0.3, x1: 0, z1: 14.7, height: 10 },
    { id: 'fondo', x0: 0, z0: 14.7, x1: 50.35, z1: 14.7, height: 10 },
    { id: 'derecha', x0: 50.35, z0: -0.3, x1: 50.35, z1: 14.7, height: 10 },
    { id: 'frente', x0: 0, z0: -0.3, x1: 50.35, z1: -0.3, height: 0.6, cut: true },
  ],
  doors: [
    { name: 'Portón pasillo 1', wall: 'izquierda', from: 1.9, to: 5.9 },
    { name: 'Portón pasillo 2', wall: 'izquierda', from: 8.3, to: 12.6 },
    { name: 'Portón junto a la computadora', wall: 'frente', from: 33.0, to: 36.75 },
  ],

  building: { x0: -10, x1: 65, z0: -5, z1: 15 },
  wallHeight: 10,

  // Moldes según el plano; las demás zonas aún no figuran en el plano: posición provisoria (playa a la derecha).
  zones: [
    { code: 'MOLDES', name: 'Moldes', kind: 'moldes', x: 36.5, z: -4.6, w: 14.5, d: 3.6 },
    // Stages de descarga (mercadería pre-ingreso), afuera, frente a cada portón (escrito "AL.9C" en el plano).
    { code: 'AL.9C', name: 'Stage 1 · descarga pre-ingreso', kind: 'recepcion', x: -9.5, z: 1.9, w: 9.2, d: 4.0 },
    { code: 'AL.9C-2', name: 'Stage 2 · descarga pre-ingreso', kind: 'recepcion', x: -9.5, z: 8.3, w: 9.2, d: 4.3 },
    { code: 'PC', name: 'Puesto de computadora', kind: 'servicio', x: 31.6, z: 0.2, w: 1.2, d: 1.1 },
    { code: 'BINES', name: 'Bines para la basura', kind: 'servicio', x: 35.4, z: 5.9, w: 1.2, d: 2.4 },
    // Aún sin ubicar en el plano: quedan afuera, a la derecha, hasta saber dónde van.
    { code: 'W0WIP', name: 'WIP – armado (a ubicar)', kind: 'wip', x: 52, z: 0.5, w: 12, d: 5 },
    { code: 'EXP', name: 'Expedición (a ubicar)', kind: 'expedicion', x: 52, z: 7, w: 8, d: 4 },
    { code: 'F1', name: 'Ubicación F1 (a ubicar)', kind: 'piso', x: 61, z: 7, w: 1.4, d: 1.4 },
    { code: 'L1', name: 'Ubicación L1 (a ubicar)', kind: 'piso', x: 62.8, z: 7, w: 1.4, d: 1.4 },
    { code: 'Q1', name: 'Ubicación Q1 (a ubicar)', kind: 'piso', x: 61, z: 9, w: 1.4, d: 1.4 },
  ],
};
