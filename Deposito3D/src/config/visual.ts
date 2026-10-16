/**
 * Parámetros visuales del modo realista (embalajes). Cambiarlos no afecta datos ni ubicaciones.
 */
export const VISUAL = {
  /** Probabilidad de que un pallet esté envuelto en film, según el tipo de carga. */
  filmShare: { carton: 0.6, plastico: 0.45, klt: 0.3, film: 1, cajon: 0 } as Record<string, number>,
  /** De los pallets con film, qué parte lleva film abundante (más vueltas, pliegues, acumulaciones). */
  heavyFilmShare: 0.35,
};

/** Calidad gráfica, como en la configuración de un juego. */
export type Quality = 'bajo' | 'medio' | 'alto' | 'ultra';

export interface QualitySettings {
  label: string;
  /** Pallets con tablas, cajas individuales y film (si no, bloques simples). */
  detailedLoads: boolean;
  shadows: boolean;
  shadowMap: number;
  /** Resolución máxima (densidad de píxeles). */
  dpr: [number, number];
  /** Oclusión ambiental (sombras de contacto entre cajas, pallets y estanterías). */
  ao: boolean;
  /** Brillo suave en luces y reflejos fuertes. */
  bloom: boolean;
  /** Suavizado de bordes. */
  smaa: boolean;
  /** Viñeta suave en los bordes de la imagen. */
  vignette: boolean;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  bajo: { label: 'Bajo', detailedLoads: false, shadows: false, shadowMap: 1024, dpr: [1, 1], ao: false, bloom: false, smaa: false, vignette: false },
  medio: { label: 'Medio', detailedLoads: true, shadows: true, shadowMap: 2048, dpr: [1, 1.5], ao: false, bloom: false, smaa: true, vignette: false },
  alto: { label: 'Alto', detailedLoads: true, shadows: true, shadowMap: 2048, dpr: [1, 2], ao: true, bloom: false, smaa: true, vignette: true },
  ultra: { label: 'Ultra', detailedLoads: true, shadows: true, shadowMap: 4096, dpr: [1, 2], ao: true, bloom: true, smaa: true, vignette: true },
};
