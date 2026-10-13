/**
 * Datos FICTICIOS de inventario, generados de forma determinística a partir
 * del código de ubicación (siempre dan el mismo resultado).
 * Más adelante este módulo se reemplazará por la fuente real (Excel / base de datos)
 * manteniendo la misma interfaz `getLocationInfo`.
 */
import type { LocationStatus, StorageLocation } from '../domain/types';

export interface LocationInfo {
  status: LocationStatus;
  sku?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  lot?: string;
  expiry?: string;
  /** Ocupación de la posición en % (0..100). */
  fillPercent: number;
  lastMovement: string;
  note?: string;
}

const PRODUCTS = [
  { sku: 'MP-1001', description: 'Resina PVC grado K67', unit: 'bolsas' },
  { sku: 'MP-1024', description: 'Carbonato de calcio micronizado', unit: 'bolsas' },
  { sku: 'MP-2040', description: 'Pigmento azul ftalocianina', unit: 'baldes' },
  { sku: 'IN-3102', description: 'Film stretch 23 µm', unit: 'rollos' },
  { sku: 'IN-3150', description: 'Caja corrugada 40x30x30', unit: 'unid.' },
  { sku: 'PT-5001', description: 'Perfil terminado 3 m', unit: 'atados' },
  { sku: 'PT-5012', description: 'Tapa plástica 110 mm', unit: 'cajas' },
  { sku: 'RP-7003', description: 'Rodamiento 6205 2RS', unit: 'cajas' },
  { sku: 'RP-7020', description: 'Correa dentada HTD 8M', unit: 'unid.' },
  { sku: 'QM-8800', description: 'Aditivo estabilizante Ca/Zn', unit: 'tambores' },
];

/** Hash FNV-1a → generador pseudoaleatorio reproducible. */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const BASE_DATE = new Date(2026, 9, 1);
const cache = new Map<string, LocationInfo>();

export function getLocationInfo(location: StorageLocation): LocationInfo {
  const cached = cache.get(location.code);
  if (cached) return cached;

  const rnd = seededRandom(location.code);
  const r = rnd();
  const status: LocationStatus =
    r < 0.62 ? 'ocupada' : r < 0.86 ? 'libre' : r < 0.95 ? 'reservada' : 'bloqueada';

  const last = new Date(BASE_DATE);
  last.setDate(last.getDate() - Math.floor(rnd() * 60));

  let info: LocationInfo;
  if (status === 'ocupada' || status === 'reservada') {
    const p = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)];
    const exp = new Date(BASE_DATE);
    exp.setMonth(exp.getMonth() + 2 + Math.floor(rnd() * 22));
    info = {
      status,
      sku: p.sku,
      description: p.description,
      unit: p.unit,
      quantity: 5 + Math.floor(rnd() * 95),
      lot: `L${2600 + Math.floor(rnd() * 400)}-${String.fromCharCode(65 + Math.floor(rnd() * 6))}`,
      expiry: fmtDate(exp),
      fillPercent: status === 'reservada' ? 100 : 35 + Math.floor(rnd() * 66),
      lastMovement: fmtDate(last),
      note: status === 'reservada' ? 'Reservada para orden de producción' : undefined,
    };
  } else {
    info = {
      status,
      fillPercent: 0,
      lastMovement: fmtDate(last),
      note: status === 'bloqueada' ? 'Bloqueada por inspección de estructura' : undefined,
    };
  }
  cache.set(location.code, info);
  return info;
}

export const STATUS_META: Record<LocationStatus, { label: string; color: string }> = {
  ocupada: { label: 'Ocupada', color: '#3b82f6' },
  libre: { label: 'Libre', color: '#22c55e' },
  reservada: { label: 'Reservada', color: '#f59e0b' },
  bloqueada: { label: 'Bloqueada', color: '#ef4444' },
};
