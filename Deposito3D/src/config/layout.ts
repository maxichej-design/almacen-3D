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
  kind: 'wip' | 'recepcion' | 'expedicion' | 'piso' | 'moldes';
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface WarehouseLayout {
  levels: number;
  /** Posiciones de pallet por módulo (dibujo). */
  palletsPerModule: number;
  rack: RackDimensions;
  /** Edificio (estanterías + playa). */
  building: { x0: number; x1: number; z0: number; z1: number };
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

  rows: [
    // Bloque izquierdo
    { id: 'A', aisle: '1', x: 3.15, z: 0.2, modules: 10, facing: 1, emptyStart: EMPTY, emptyEnd: EMPTY },
    { id: 'B', aisle: '1', x: 3.15, z: 5.9, modules: 11, facing: -1, emptyStart: EMPTY },
    { id: 'C', aisle: '2', x: 3.15, z: 5.9 + DEPTH + 0.2, modules: 11, facing: 1, emptyStart: EMPTY },
    // Fila larga de abajo (cruza los dos bloques)
    { id: 'D', aisle: '2', x: 3.15, z: 12.6, modules: 17, facing: -1, emptyStart: EMPTY, emptyEnd: EMPTY },
    // Bloque derecho
    { id: 'E', aisle: '1', x: 38.1, z: 0.8, modules: 4, facing: 1, emptyEnd: EMPTY },
    { id: 'F', aisle: '1', x: 38.1, z: 5.9, modules: 4, facing: -1, emptyEnd: EMPTY },
    { id: 'G', aisle: '2', x: 38.1, z: 5.9 + DEPTH + 0.2, modules: 4, facing: 1, emptyEnd: EMPTY },
  ],

  aisles: [
    { id: '1', name: 'Pasillo 1', x0: 0.4, x1: 51.5, z0: 1.9, z1: 5.9 },
    { id: '2', name: 'Pasillo 2', x0: 0.4, x1: 51.5, z0: 8.3, z1: 12.6 },
    { id: 'T', name: 'Pasillo transversal', x0: 33, x1: 38, z0: 1.9, z1: 12.6 },
  ],

  building: { x0: 0, x1: 68, z0: -5, z1: 14 },
  wallHeight: 10,

  // Moldes según el plano; las demás zonas aún no figuran en el plano: posición provisoria (playa a la derecha).
  zones: [
    { code: 'MOLDES', name: 'Moldes', kind: 'moldes', x: 36.5, z: -4.6, w: 14.5, d: 3.6 },
    { code: 'REC', name: 'Recepción (posición a confirmar)', kind: 'recepcion', x: 53, z: 0, w: 13, d: 4 },
    { code: 'W0WIP', name: 'WIP – armado (posición a confirmar)', kind: 'wip', x: 53, z: 5, w: 13, d: 4 },
    { code: 'EXP', name: 'Expedición (posición a confirmar)', kind: 'expedicion', x: 53, z: 10, w: 9, d: 3.5 },
    { code: 'F1', name: 'Ubicación F1', kind: 'piso', x: 63, z: 10, w: 1.4, d: 1.4 },
    { code: 'L1', name: 'Ubicación L1', kind: 'piso', x: 64.8, z: 10, w: 1.4, d: 1.4 },
    { code: 'Q1', name: 'Ubicación Q1', kind: 'piso', x: 63, z: 12, w: 1.4, d: 1.4 },
  ],
};
