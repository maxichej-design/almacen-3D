/**
 * Configuración física del depósito.
 * Todas las medidas están en metros. Modificando este archivo se cambia
 * la cantidad de pasillos, módulos, niveles y las dimensiones del modelo 3D.
 */
export interface RackDimensions {
  /** Ancho de un módulo (distancia entre parantes), eje X. */
  bayWidth: number;
  /** Profundidad de la estantería, eje Z. */
  depth: number;
  /** Altura libre de cada nivel. */
  levelHeight: number;
  /** Altura del primer larguero sobre el piso (0 = paletas apoyadas en el piso). */
  firstLevelHeight: number;
  /** Sección de los parantes verticales. */
  uprightSize: number;
  /** Altura de los largueros horizontales. */
  beamHeight: number;
}

export interface AisleConfig {
  /** Identificador corto, p. ej. "P1". Forma parte del código de ubicación. */
  id: string;
  name: string;
  /** Letra del cartel pintado en la pared al final del pasillo. */
  sign: string;
}

export interface WarehouseLayout {
  aisles: AisleConfig[];
  /** Módulos por cada fila de estanterías. */
  baysPerRow: number;
  /** Niveles por módulo. */
  levels: number;
  /** Ancho de cada pasillo (espacio de circulación). */
  aisleWidth: number;
  /** Separación entre dos filas espalda con espalda. */
  backToBackGap: number;
  rack: RackDimensions;
  /** Margen libre alrededor de las estanterías (piso y paredes). */
  floorMargin: number;
  wallHeight: number;
}

export const warehouseLayout: WarehouseLayout = {
  aisles: [
    { id: 'P1', name: 'Pasillo 1', sign: 'A' },
    { id: 'P2', name: 'Pasillo 2', sign: 'B' },
  ],
  baysPerRow: 12,
  levels: 6,
  aisleWidth: 3.0, // pasillo para autoelevador retráctil
  backToBackGap: 0.3,
  rack: {
    bayWidth: 2.7,
    depth: 1.1,
    levelHeight: 1.35,
    firstLevelHeight: 0,
    uprightSize: 0.09,
    beamHeight: 0.12,
  },
  floorMargin: 6,
  wallHeight: 11,
};
