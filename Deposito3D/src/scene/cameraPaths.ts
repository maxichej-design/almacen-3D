import { layout } from '../config/layout';
import type { InventoryIndex } from '../domain/inventory';
import type { Selection, Warehouse } from '../domain/types';

export type Vec3 = [number, number, number];

/** Un punto de la trayectoria de cámara. `duration` en segundos para llegar a él. */
export interface CameraKeyframe {
  position: Vec3;
  target: Vec3;
  duration?: number;
}

const EYE = 1.65;

/** Vista general desde atrás de la fila G (lado de la pared baja), mirando hacia la A. */
export function generalView(wh: Warehouse): CameraKeyframe[] {
  const inn = layout.interior;
  const cx = (inn.x0 + inn.x1) / 2;
  const cz = (inn.z0 + inn.z1) / 2;
  const span = inn.x1 - inn.x0;
  void wh;
  return [{ target: [cx, 1, cz + 1], position: [cx + span * 0.12, span * 0.62, inn.z0 - span * 0.55] }];
}

export function planView(wh: Warehouse): CameraKeyframe[] {
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);
  return [{ target: [cx, 0, cz], position: [cx, span * 1.15, cz + 0.01] }];
}

/** Vista de una ubicación desde el pasillo, en diagonal. */
function locationView(wh: Warehouse, code: string): CameraKeyframe[] {
  const loc = wh.locationIndex.get(code);
  if (!loc) return [];
  const [x, y, z] = loc.position;
  const aisle = wh.aisles.find((a) => a.id === loc.aisleId);
  const width = aisle ? aisle.z1 - aisle.z0 : 3;
  const dz = layout.rack.depth / 2 + width * 0.7;
  return [{ target: [x, y, z], position: [x + 3.2, Math.max(EYE, y + 0.8), z + loc.facing * dz] }];
}

/**
 * Recorrido a pie: desde la playa, entra por la cabecera del pasillo y camina
 * a la altura de los ojos hasta quedar frente a la ubicación.
 */
export function walkToLocation(wh: Warehouse, code: string): CameraKeyframe[] {
  const loc = wh.locationIndex.get(code);
  if (!loc) return [];
  const aisle = wh.aisles.find((a) => a.id === loc.aisleId);
  if (!aisle) return locationView(wh, code);
  const [x, y, z] = loc.position;
  const az = aisle.centerZ;
  // Entra por la cabecera del pasillo más cercana a la ubicación.
  const s = aisle.x1 - x < x - aisle.x0 ? 1 : -1;
  const entranceX = s > 0 ? aisle.x1 - 1 : aisle.x0 + 1;
  const standX = x + s * 2.8;
  const walkDist = Math.abs(entranceX - standX);
  return [
    { position: [entranceX + s * 3, EYE + 2.5, az], target: [entranceX - s * 6, EYE, az], duration: 1.6 },
    { position: [entranceX, EYE, az], target: [entranceX - s * 10, EYE, az], duration: 1.2 },
    { position: [standX + s * 1.5, EYE, az], target: [x - s * 3, EYE, az], duration: Math.max(1, walkDist / 4.5) },
    // Se para del lado opuesto del pasillo para ver la ubicación completa.
    { position: [standX, EYE, az + loc.facing * 0.8], target: [x, y, z], duration: 1.1 },
  ];
}

function rowView(wh: Warehouse, id: string): CameraKeyframe[] {
  const row = wh.rowIndex.get(id);
  if (!row) return [];
  const midX = (row.x0 + row.x1) / 2;
  const midZ = (row.z0 + row.z1) / 2;
  const h = wh.bounds.height;
  return [{ target: [midX, h * 0.4, midZ], position: [midX + 14, h * 2.3, midZ + row.facing * 11] }];
}

function zoneView(wh: Warehouse, code: string): CameraKeyframe[] {
  const z = wh.zoneIndex.get(code);
  if (!z) return [];
  const cx = z.x0 + z.w / 2;
  const cz = z.z0 + z.d / 2;
  const s = Math.max(z.w, z.d);
  return [{ target: [cx, 0.5, cz], position: [cx + s * 0.9 + 3, s * 1.1 + 4, cz + s * 0.9 + 3] }];
}

/** Encuadra todas las ubicaciones donde está un número de parte. */
function partView(wh: Warehouse, index: InventoryIndex, pn: string): CameraKeyframe[] {
  const p = index.byPart.get(pn);
  if (!p) return [];
  const pts: Vec3[] = [];
  for (const r of [...p.fifo, ...p.outside]) {
    const loc = wh.locationIndex.get(r.location);
    if (loc) pts.push(loc.position);
    const z = wh.zoneIndex.get(r.location);
    if (z) pts.push([z.x0 + z.w / 2, 0.5, z.z0 + z.d / 2]);
  }
  if (pts.length === 0) return [];
  if (pts.length === 1) return [{ target: pts[0], position: [pts[0][0] + 8, pts[0][1] + 9, pts[0][2] + 8] }];
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 10);
  return [{ target: [cx, 2, cz], position: [cx + span * 0.5, span * 0.9 + 6, cz + span * 0.7] }];
}

export function viewForSelection(wh: Warehouse, index: InventoryIndex, sel: Selection): CameraKeyframe[] {
  if (!sel) return [];
  switch (sel.kind) {
    case 'location':
      return locationView(wh, sel.code);
    case 'row':
      return rowView(wh, sel.id);
    case 'zone':
      return zoneView(wh, sel.code);
    case 'part':
      return partView(wh, index, sel.partNumber);
  }
}
