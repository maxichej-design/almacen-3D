/** Lado del pasillo en el que está una fila de estanterías. */
export type AisleSide = 'I' | 'D'; // Izquierda | Derecha

export type LocationStatus = 'ocupada' | 'libre' | 'reservada' | 'bloqueada';

/** Una ubicación es una posición de paleta: un módulo en un nivel. */
export interface StorageLocation {
  /** Código único, p. ej. "P1-I-03-2". */
  code: string;
  rackId: string;
  aisleId: string;
  side: AisleSide;
  /** Número de módulo dentro de la fila (1..n). */
  bay: number;
  /** Nivel (1 = piso). */
  level: number;
  /** Centro de la ubicación en coordenadas del mundo. */
  position: [number, number, number];
  /** Tamaño del volumen útil. */
  size: [number, number, number];
}

/** Una estantería es una fila continua de módulos a un lado de un pasillo. */
export interface Rack {
  id: string;
  aisleId: string;
  aisleName: string;
  side: AisleSide;
  /** Esquina inicial (x mínimo, piso, z mínimo). */
  origin: [number, number, number];
  /** Dirección hacia la que mira el frente de la estantería (+1 / -1 en Z). */
  facing: 1 | -1;
  bays: number;
  levels: number;
  locations: StorageLocation[];
}

export interface Aisle {
  id: string;
  name: string;
  sign: string;
  /** Centro del pasillo en Z. */
  centerZ: number;
  width: number;
}

export interface WarehouseModel {
  aisles: Aisle[];
  racks: Rack[];
  /** Acceso directo a cualquier ubicación por código. */
  locationsByCode: Map<string, StorageLocation>;
  racksById: Map<string, Rack>;
  /** Extensión total del área de estanterías. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
}

export type Selection =
  | { kind: 'location'; code: string }
  | { kind: 'rack'; id: string }
  | null;
