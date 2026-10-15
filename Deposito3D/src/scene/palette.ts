import { AGE_BUCKETS } from '../config/policies';
import { ageBucket, type LocationSummary } from '../domain/inventory';
import type { AbcClass, ColorMode, CountStatus } from '../domain/types';

/** Colores de la estructura y el edificio. */
export const SCENE = {
  upright: '#1e3a8a',
  beam: '#ea580c',
  frameHover: '#60a5fa',
  frameSelected: '#22d3ee',
  guard: '#dc2626',
  floor: '#d7dbe0',
  floorLine: '#facc15',
  wall: '#f1f5f9',
  wallSide: '#e2e8f0',
  door: '#94a3b8',
  wallBlock: '#2b3640',
  wallSheet: '#6b7480',
  doorPanel: '#b8bec6',
  doorFrame: '#d6dade',
  palletWood: '#b9915a',
  palletPlastic: '#1d4ed8',
  carton: '#dcb983',
  cartonAlt: '#e6cc9f',
  film: '#f3f4f6',
  klt: '#7b8494',
  crate: '#15803d',
  free: '#22c55e',
  selected: '#22d3ee',
  hover: '#ffffff',
  part: '#d946ef',
};

/** Clase ABC: identidad categórica (D = obsoleta, en gris). */
export const ABC_COLORS: Record<AbcClass, string> = { A: '#2a78d6', B: '#eb6834', C: '#1baf7a', D: '#898781' };
export const ABC_LABEL: Record<AbcClass, string> = {
  A: 'A – alta rotación',
  B: 'B – rotación media',
  C: 'C – baja rotación',
  D: 'D – obsoleta',
};

/** Estado de conteo cíclico: colores de estado reservados. */
export const COUNT_COLORS: Record<CountStatus, string> = {
  'al-dia': '#0ca30c',
  'por-vencer': '#fab219',
  vencido: '#d03b3b',
  obsoleto: '#898781',
  'sin-stock': '#cbd5e1',
};
export const COUNT_LABEL: Record<CountStatus, string> = {
  'al-dia': 'Al día',
  'por-vencer': 'Por vencer',
  vencido: 'Vencido',
  obsoleto: 'Obsoleto (D)',
  'sin-stock': 'Sin stock',
};
export const COUNT_ICON: Record<CountStatus, string> = {
  'al-dia': '✓',
  'por-vencer': '◷',
  vencido: '!',
  obsoleto: '⊘',
  'sin-stock': '–',
};

/** Antigüedad: rampa secuencial de un solo tono (claro = reciente, oscuro = viejo). */
export const AGE_COLORS = ['#9ec5f4', '#5598e7', '#256abf', '#184f95', '#0d366b'];

export const OCCUPANCY = { one: '#86b6ef', many: '#256abf' };

export const COLOR_MODES: Array<{ id: ColorMode; label: string }> = [
  { id: 'ocupacion', label: 'Realista' },
  { id: 'abc', label: 'Clase ABC' },
  { id: 'antiguedad', label: 'Antigüedad (FIFO)' },
  { id: 'conteo', label: 'Conteo cíclico' },
];

export function legendFor(mode: ColorMode): Array<{ color: string; label: string; icon?: string }> {
  switch (mode) {
    case 'ocupacion':
      return [
        { color: SCENE.carton, label: 'Con stock' },
        { color: SCENE.free, label: 'Libre' },
      ];
    case 'abc':
      return (Object.keys(ABC_COLORS) as AbcClass[]).map((c) => ({ color: ABC_COLORS[c], label: ABC_LABEL[c] }));
    case 'antiguedad':
      return AGE_BUCKETS.map((b, i) => ({ color: AGE_COLORS[i], label: b.label }));
    case 'conteo':
      return (['al-dia', 'por-vencer', 'vencido', 'obsoleto'] as CountStatus[]).map((s) => ({
        color: COUNT_COLORS[s],
        label: COUNT_LABEL[s],
        icon: COUNT_ICON[s],
      }));
  }
}

/** Color de la carga de una ubicación según el modo (undefined = color natural). */
export function tintFor(summary: LocationSummary, mode: ColorMode): string | undefined {
  switch (mode) {
    case 'ocupacion':
      return undefined;
    case 'abc':
      return summary.abc ? ABC_COLORS[summary.abc] : '#cbd5e1';
    case 'antiguedad':
      return summary.ageDays == null ? '#cbd5e1' : AGE_COLORS[ageBucket(summary.ageDays)];
    case 'conteo':
      return COUNT_COLORS[summary.count.status];
  }
}
