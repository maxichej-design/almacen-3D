/** Clasificación ABC. D = obsoleta (ya no se usa). */
export type AbcClass = 'A' | 'B' | 'C' | 'D';

/** Una ubicación de estantería (posición de pallet): fila + módulo + nivel. */
export interface RackLocation {
  /** Código normalizado, p. ej. "C5.1". */
  code: string;
  rowId: string;
  aisleId: string;
  module: number;
  /** 1 = piso. */
  level: number;
  /** Centro del hueco en coordenadas del mundo. */
  position: [number, number, number];
  size: [number, number, number];
  /** Altura donde apoya la carga (piso o larguero). */
  baseY: number;
  /** Hacia dónde mira el frente (+1 / -1 en Z). */
  facing: 1 | -1;
  /** Índice dentro de Warehouse.locations (para dibujado instanciado). */
  index: number;
}

/** Fila de estanterías identificada por letra. */
export interface RackRow {
  id: string;
  aisleId: string;
  aisleName: string;
  facing: 1 | -1;
  /** Extremos en X (módulo 1 está en x1, del lado de la playa). */
  x0: number;
  x1: number;
  /** Borde trasero/delantero en Z. */
  z0: number;
  z1: number;
  locations: RackLocation[];
}

export interface Aisle {
  id: string;
  name: string;
  centerZ: number;
  width: number;
  left: string;
  right: string;
}

export interface Zone {
  code: string;
  name: string;
  kind: 'wip' | 'recepcion' | 'expedicion' | 'piso';
  /** Rectángulo en el mundo. */
  x0: number;
  z0: number;
  w: number;
  d: number;
}

export interface Warehouse {
  aisles: Aisle[];
  rows: RackRow[];
  locations: RackLocation[];
  locationIndex: Map<string, RackLocation>;
  rowIndex: Map<string, RackRow>;
  zones: Zone[];
  zoneIndex: Map<string, Zone>;
  /** Extensión del edificio (estanterías + playa). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
}

/** Un registro de stock: una pieza (o lote) en una ubicación. */
export interface StockRecord {
  location: string;
  partNumber: string;
  description?: string;
  qty: number;
  uom?: string;
  abc?: AbcClass;
  /** Fecha de ingreso (ISO yyyy-mm-dd), base del FIFO. */
  receivedAt?: string;
  lot?: string;
  /** Fecha del último conteo cíclico (ISO). */
  lastCountAt?: string;
  /** Dónde se usa (módulo / producto / proyecto), si el reporte lo trae. */
  usedIn?: string;
}

export interface Inventory {
  source: 'demo' | 'import';
  /** Nombre del archivo importado o descripción. */
  label: string;
  loadedAt: string;
  records: StockRecord[];
}

export type Selection =
  | { kind: 'location'; code: string }
  | { kind: 'row'; id: string }
  | { kind: 'zone'; code: string }
  | { kind: 'part'; partNumber: string }
  | null;

export type ColorMode = 'ocupacion' | 'abc' | 'antiguedad' | 'conteo';

export type CountStatus = 'al-dia' | 'por-vencer' | 'vencido' | 'obsoleto' | 'sin-stock';
