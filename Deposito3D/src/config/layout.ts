/**
 * Layout físico del depósito. Todas las medidas en metros.
 *
 * ESTE ARCHIVO ES EL QUE HAY QUE AJUSTAR CON EL LAYOUT DE INGENIERÍA:
 * cantidad de filas, módulos, niveles, medidas y zonas de piso.
 *
 * Nomenclatura de ubicaciones de estantería: <Fila><Módulo>.<Nivel>
 *   p. ej. "C5.1" = fila C, módulo 5, nivel 1 (piso).
 */

export interface RackDimensions {
  /** Ancho de un módulo (distancia entre parantes). */
  bayWidth: number;
  /** Profundidad de la estantería. */
  depth: number;
  /** Altura de cada nivel. */
  levelHeight: number;
  uprightSize: number;
  beamHeight: number;
}

/** Un pasillo con una fila de estanterías a cada lado (letra de la fila). */
export interface AisleConfig {
  id: string;
  name: string;
  left: string;
  right: string;
}

/** Zona de piso que no es estantería (WIP, recepción, otras ubicaciones). */
export interface ZoneConfig {
  /** Código tal como aparece en el sistema, p. ej. "W0WIP". */
  code: string;
  name: string;
  kind: 'wip' | 'recepcion' | 'expedicion' | 'piso';
  /** Posición en el área de playa (frente de las estanterías), en metros. */
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface WarehouseLayout {
  aisles: AisleConfig[];
  modulesPerRow: number;
  levels: number;
  aisleWidth: number;
  backToBackGap: number;
  rack: RackDimensions;
  /** Profundidad del área libre (playa) al frente de las filas, donde están las zonas. */
  stagingDepth: number;
  margin: number;
  wallHeight: number;
  zones: ZoneConfig[];
}

export const layout: WarehouseLayout = {
  // Tentativo, según los videos (carteles A, B, C, E, F, G). A confirmar con ingeniería.
  aisles: [
    { id: '1', name: 'Pasillo 1', left: 'A', right: 'B' },
    { id: '2', name: 'Pasillo 2', left: 'C', right: 'D' },
    { id: '3', name: 'Pasillo 3', left: 'E', right: 'F' },
    { id: '4', name: 'Pasillo 4', left: 'G', right: 'H' },
  ],
  modulesPerRow: 12,
  levels: 5,
  aisleWidth: 3.0,
  backToBackGap: 0.3,
  rack: {
    bayWidth: 2.7,
    depth: 1.1,
    levelHeight: 1.45,
    uprightSize: 0.09,
    beamHeight: 0.12,
  },
  stagingDepth: 16,
  margin: 3,
  wallHeight: 10,
  // x/z relativos a la esquina de la playa (x = 0 es el frente de las filas, z = 0 el lateral).
  zones: [
    { code: 'REC', name: 'Recepción', kind: 'recepcion', x: 2, z: 1, w: 9, d: 7 },
    { code: 'W0WIP', name: 'WIP – armado', kind: 'wip', x: 2, z: 10, w: 9, d: 8 },
    { code: 'EXP', name: 'Expedición', kind: 'expedicion', x: 2, z: 20, w: 9, d: 7 },
    { code: 'F1', name: 'Ubicación F1', kind: 'piso', x: 12.5, z: 10, w: 2.5, d: 2.5 },
    { code: 'L1', name: 'Ubicación L1', kind: 'piso', x: 12.5, z: 13.5, w: 2.5, d: 2.5 },
    { code: 'Q1', name: 'Ubicación Q1', kind: 'piso', x: 12.5, z: 17, w: 2.5, d: 2.5 },
  ],
};
