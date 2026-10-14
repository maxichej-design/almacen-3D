import type { AbcClass } from '../domain/types';

/**
 * Reglas de inventario. Ajustables según el procedimiento de la planta.
 */

/** Días entre conteos cíclicos por clase. D = obsoleto: no se cuenta, se revisa para baja. */
export const COUNT_INTERVAL_DAYS: Record<Exclude<AbcClass, 'D'>, number> = {
  A: 60,
  B: 90,
  C: 120,
};

/** Días antes del vencimiento a partir de los cuales el conteo figura "por vencer". */
export const COUNT_WARNING_DAYS = 14;

/** Tramos de antigüedad del stock (días desde el ingreso), para FIFO y el mapa de calor. */
export const AGE_BUCKETS = [
  { max: 30, label: '0–30 d' },
  { max: 90, label: '31–90 d' },
  { max: 180, label: '91–180 d' },
  { max: 365, label: '181–365 d' },
  { max: Infinity, label: '> 1 año' },
] as const;
