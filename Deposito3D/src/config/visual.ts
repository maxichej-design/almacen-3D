/**
 * Parámetros visuales del modo realista (embalajes). Cambiarlos no afecta datos ni ubicaciones.
 */
export const VISUAL = {
  /** Probabilidad de que un pallet esté envuelto en film, según el tipo de carga. */
  filmShare: { carton: 0.6, plastico: 0.45, klt: 0.3, film: 1, cajon: 0 } as Record<string, number>,
  /** De los pallets con film, qué parte lleva film abundante (más vueltas, pliegues, acumulaciones). */
  heavyFilmShare: 0.35,
  /**
   * Etapa 1 de la mejora gráfica: solo esta ubicación se dibuja con el pallet detallado
   * (posición 1 con film normal y posición 2 con film abundante) para revisar el resultado.
   */
  showcase: 'E4.1',
};
