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
  /** Dónde está el módulo 1: 'inicio' = x menor (izquierda del plano), 'fin' = x mayor. */
  module1?: 'inicio' | 'fin';
  /** El módulo 1 es medio módulo (una sola posición de pallet). */
  halfModule1?: boolean;
  /** El último módulo es medio módulo. */
  halfModuleLast?: boolean;
  /** Niveles donde la mercadería va en cajones plásticos verdes (solo cambia el dibujo). */
  crateLevels?: number[];
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
  kind: 'wip' | 'recepcion' | 'expedicion' | 'piso' | 'moldes' | 'servicio' | 'bin';
  /** La ubicación está en la estantería (cartel colgante); en el piso solo se marca. */
  inRack?: boolean;
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

/**
 * Datos de la chapa Mecalux de las cabeceras (estantería convencional para carga paletizada).
 * Se muestran en la ficha de cada fila.
 */
export const RACK_SPEC = {
  fabricante: 'Mecalux',
  sistema: 'Estantería convencional para carga paletizada',
  palletTipo: 'IRAM 10016',
  palletDimensiones: '1000 × 1200 × 1100 mm (D × A × H)',
  cargaPorPallet: 800,
  palletsPorNivel: 2,
  alturasNiveles: [1350, 1350, 1300, 1300, 1300],
  larguero: 'TB100, 2300 mm',
  nivelesConLarguero: 5,
  cargaPorNivel: 1600,
  bastidor: '880',
  cargaPorModulo: 8100,
  anio: 2022,
};

// Medidas reales de la estructura (chapa Mecalux): larguero 2,30 m + parante.
const BAY = 2.4;
const DEPTH = 1.0;

/*
 * Coordenadas en METROS REALES (medidas de la chapa Mecalux). Origen: x 0 ≈ donde empezaba la
 * estantería del plano de ingeniería; z 0 ≈ pared del frente (detrás de la G). Para alargar o
 * acortar una fila, cambiar `modules` y su `x` de inicio; el lado del hall queda fijo.
 */
const HALL_X = 29.2; // fin de E/F (comienzo del pasillo transversal / hall)
const WALL_LEFT = -2.0; // pared de los portones de recepción
const WALL_RIGHT = 44.76; // pared donde terminan A y el bloque derecho

export const layout: WarehouseLayout = {
  levels: 6, // 5 niveles con larguero + el piso
  palletsPerModule: 2,
  // Alturas de nivel de la chapa: 1350/1350/1300/1300/1300 mm (se usa el promedio).
  rack: { bayWidth: BAY, depth: DEPTH, levelHeight: 1.32, uprightSize: 0.09, beamHeight: 0.1 },

  // Nombres según el plano completado a mano en planta (15/10/2026).
  rows: [
    // Bloque izquierdo: el módulo 1 está del lado del hall (video: E1/E2 frente a C|B).
    // G: 10 módulos enteros + medio módulo adelante (G1, junto a la compu) y medio atrás (G12).
    { id: 'G', aisle: '1', x: 28.0 - 10 * BAY - BAY, z: 0.18, modules: 12, facing: 1, module1: 'fin', halfModule1: true, halfModuleLast: true },
    { id: 'F', aisle: '1', x: HALL_X - 12 * BAY, z: 5.24, modules: 12, facing: -1, module1: 'fin' },
    { id: 'E', aisle: '2', x: HALL_X - 12 * BAY, z: 6.4, modules: 12, facing: 1, module1: 'fin' },
    // Fila larga de abajo (cruza los dos bloques) y llega hasta la pared derecha.
    { id: 'A', aisle: '2', x: WALL_RIGHT - 0.09 - 18 * BAY, z: 11.2, modules: 18, facing: -1 },
    // Bloque derecho: 5 módulos, el 1 del lado de la pared y el 5 hacia el hall de entrada.
    { id: 'D', aisle: '1', x: 32.67, z: 0.71, modules: 5, facing: 1, module1: 'fin' },
    { id: 'C', aisle: '1', x: 32.67, z: 5.24, modules: 5, facing: -1, module1: 'fin' },
    // Fila B: en el piso la mercadería va en cajones verdes (video 15/10).
    { id: 'B', aisle: '2', x: 32.67, z: 6.4, modules: 5, facing: 1, module1: 'fin', crateLevels: [1] },
  ],

  aisles: [
    { id: '1', name: 'Pasillo 1', x0: WALL_LEFT + 0.4, x1: WALL_RIGHT - 0.4, z0: 1.69, z1: 5.24 },
    { id: '2', name: 'Pasillo 2', x0: WALL_LEFT + 0.4, x1: WALL_RIGHT - 0.4, z0: 7.38, z1: 11.2 },
    { id: 'T', name: 'Pasillo transversal', x0: HALL_X + 0.1, x1: 32.67, z0: 1.69, z1: 11.2 },
  ],

  // Paredes: izquierda con dos portones; A llega hasta la pared derecha;
  // ~1 m detrás de la A y ~0,5 m detrás de la G (esa se dibuja baja para poder mirar desde ahí).
  interior: { x0: WALL_LEFT, x1: WALL_RIGHT, z0: -0.27, z1: 13.07 },
  walls: [
    { id: 'izquierda', x0: WALL_LEFT, z0: -0.27, x1: WALL_LEFT, z1: 13.07, height: 10 },
    { id: 'fondo', x0: WALL_LEFT, z0: 13.07, x1: WALL_RIGHT, z1: 13.07, height: 10 },
    { id: 'derecha', x0: WALL_RIGHT, z0: -0.27, x1: WALL_RIGHT, z1: 13.07, height: 10 },
    { id: 'frente', x0: WALL_LEFT, z0: -0.27, x1: WALL_RIGHT, z1: -0.27, height: 0.6, cut: true },
  ],
  doors: [
    // Los tres portones tienen la misma medida (3,6 m de ancho, 5 m de alto).
    { name: 'Recepción 1', wall: 'izquierda', from: 1.67, to: 5.27 },
    { name: 'Recepción 2', wall: 'izquierda', from: 7.49, to: 11.09 },
    // La entrada principal está en el medio: da al hall (pasillo transversal), junto a la compu.
    { name: 'Entrada', wall: 'frente', from: 29.2, to: 32.8 },
  ],

  building: { x0: WALL_LEFT - 8.6, x1: WALL_RIGHT + 1.5, z0: -2.7, z1: 13.8 },
  wallHeight: 10,

  zones: [
    // Recepción: stages afuera de los portones del fondo; llegan los pallets, se cuentan y se ingresan
    // (escrito "AL.9C" en el plano).
    { code: 'AL.9C', name: 'Recepción 1 · stage pre-ingreso', kind: 'recepcion', x: WALL_LEFT - 8.2, z: 1.67, w: 8.0, d: 3.6 },
    { code: 'AL.9C-2', name: 'Recepción 2 · stage pre-ingreso', kind: 'recepcion', x: WALL_LEFT - 8.2, z: 7.49, w: 8.0, d: 3.6 },
    // Bines del hall de entrada, al pie de la cabecera C | B: uno para film/plástico y otro para cartón.
    { code: 'BIN-FILM', name: 'Bin de film / plástico', kind: 'bin', x: 31.5, z: 5.29, w: 1.05, d: 0.85 },
    { code: 'BIN-CARTON', name: 'Bin de cartón', kind: 'bin', x: 31.5, z: 6.49, w: 1.05, d: 0.85 },
    // Escritorio con la computadora, al lado de la entrada.
    { code: 'PC', name: 'Puesto de computadora', kind: 'servicio', x: 28.1, z: 0.0, w: 1.05, d: 0.67 },
    // W0-WIP: cartel "UBICACIÓN W0-WIP" sobre los módulos E1–E2 (video 15/10); se marca en el piso del pasillo.
    { code: 'W0WIP', name: 'WIP – estantería E1–E2', kind: 'wip', x: HALL_X - 2 * BAY, z: 7.5, w: 2 * BAY, d: 0.6, inRack: true },
  ],
};
