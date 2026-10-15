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
const EMPTY = 1.2;

/**
 * El plano se dibujó suponiendo módulos de 2,7 m; con la medida real (2,4 m) se escala
 * todo el plano (posiciones, pasillos, paredes, zonas) por este factor.
 */
const PLAN_SCALE = BAY / 2.7;

const plan: WarehouseLayout = {
  levels: 6, // 5 niveles con larguero + el piso
  palletsPerModule: 2,
  // Alturas de nivel de la chapa: 1350/1350/1300/1300/1300 mm (se usa el promedio).
  rack: { bayWidth: BAY, depth: DEPTH, levelHeight: 1.32, uprightSize: 0.09, beamHeight: 0.1 },

  // Nombres según el plano completado a mano en planta (15/10/2026).
  rows: [
    // Bloque izquierdo (de arriba hacia abajo del plano)
    // Bloque izquierdo: el módulo 1 está del lado del pasillo transversal (video: E1/E2 junto a C|B).
    // G1 es medio módulo (una posición), junto a la compu.
    { id: 'G', aisle: '1', x: 3.15, z: 0.2, modules: 11, facing: 1, emptyStart: EMPTY, module1: 'fin', halfModule1: true },
    { id: 'F', aisle: '1', x: 3.15, z: 5.9, modules: 11, facing: -1, emptyStart: EMPTY, module1: 'fin' },
    { id: 'E', aisle: '2', x: 3.15, z: 7.2, modules: 11, facing: 1, emptyStart: EMPTY, module1: 'fin' },
    // Fila larga de abajo (cruza los dos bloques)
    { id: 'A', aisle: '2', x: 3.15, z: 12.6, modules: 17, facing: -1, emptyStart: EMPTY, emptyEnd: EMPTY },
    // Bloque derecho: 5 módulos, el 1 del lado de la pared y el 5 hacia el hall de entrada.
    { id: 'D', aisle: '1', x: 36.75, z: 0.8, modules: 5, facing: 1, module1: 'fin' },
    { id: 'C', aisle: '1', x: 36.75, z: 5.9, modules: 5, facing: -1, module1: 'fin' },
    // Fila B: en el piso la mercadería va en cajones verdes (video 15/10).
    { id: 'B', aisle: '2', x: 36.75, z: 7.2, modules: 5, facing: 1, module1: 'fin', crateLevels: [1] },
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
    // Los tres portones tienen la misma medida (4 m de ancho, 5 m de alto).
    { name: 'Recepción 1', wall: 'izquierda', from: 1.9, to: 5.9 },
    { name: 'Recepción 2', wall: 'izquierda', from: 8.45, to: 12.45 },
    // La entrada principal está en el medio: da al hall (pasillo transversal), junto a la compu.
    { name: 'Entrada', wall: 'frente', from: 32.9, to: 36.9 },
  ],

  building: { x0: -10, x1: 52, z0: -3, z1: 15.5 },
  wallHeight: 10,

  // Moldes según el plano; las demás zonas aún no figuran en el plano: posición provisoria (playa a la derecha).
  zones: [
    // Recepción: stages afuera de los portones del fondo; llegan los pallets, se cuentan y se ingresan
    // (escrito "AL.9C" en el plano).
    { code: 'AL.9C', name: 'Recepción 1 · stage pre-ingreso', kind: 'recepcion', x: -9.5, z: 1.9, w: 9.2, d: 4.0 },
    { code: 'AL.9C-2', name: 'Recepción 2 · stage pre-ingreso', kind: 'recepcion', x: -9.5, z: 8.45, w: 9.2, d: 4.0 },
    // Bines del hall de entrada, al pie de la cabecera C | B: uno para film/plástico y otro para cartón.
    { code: 'BIN-FILM', name: 'Bin de film / plástico', kind: 'bin', x: 35.4, z: 5.95, w: 1.2, d: 0.95 },
    { code: 'BIN-CARTON', name: 'Bin de cartón', kind: 'bin', x: 35.4, z: 7.3, w: 1.2, d: 0.95 },
    // Escritorio con la computadora, al lado de la entrada.
    { code: 'PC', name: 'Puesto de computadora', kind: 'servicio', x: 31.65, z: 0.0, w: 1.2, d: 0.75 },
    // W0-WIP: cartel "UBICACIÓN W0-WIP" sobre los módulos E1–E2 (video 15/10); se marca en el piso del pasillo.
    { code: 'W0WIP', name: 'WIP – estantería E1–E2', kind: 'wip', x: 27.45, z: 8.45, w: 5.4, d: 0.7, inRack: true },
  ],
};

function applyPlanScale(l: WarehouseLayout, k: number): WarehouseLayout {
  const r = (v: number) => Math.round(v * k * 1000) / 1000;
  return {
    ...l,
    rows: l.rows.map((row) => ({
      ...row,
      x: r(row.x),
      z: r(row.z),
      emptyStart: row.emptyStart && r(row.emptyStart),
      emptyEnd: row.emptyEnd && r(row.emptyEnd),
    })),
    aisles: l.aisles.map((a) => ({ ...a, x0: r(a.x0), x1: r(a.x1), z0: r(a.z0), z1: r(a.z1) })),
    zones: l.zones.map((z) => ({ ...z, x: r(z.x), z: r(z.z), w: r(z.w), d: r(z.d) })),
    doors: l.doors.map((d) => ({ ...d, from: r(d.from), to: r(d.to) })),
    walls: l.walls.map((w) => ({ ...w, x0: r(w.x0), z0: r(w.z0), x1: r(w.x1), z1: r(w.z1) })),
    interior: { x0: r(l.interior.x0), x1: r(l.interior.x1), z0: r(l.interior.z0), z1: r(l.interior.z1) },
    building: { x0: r(l.building.x0), x1: r(l.building.x1), z0: r(l.building.z0), z1: r(l.building.z1) },
  };
}

export const layout: WarehouseLayout = applyPlanScale(plan, PLAN_SCALE);
