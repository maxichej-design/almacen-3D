/**
 * Persistencia local en el navegador (por equipo). Se usa para que el inventario
 * importado y los conteos registrados no se pierdan al cerrar la página.
 * Cuando la app esté en línea, esto se reemplaza por el servidor.
 */
import type { Inventory } from '../domain/types';

const KEY_INV = 'deposito3d.inventory.v1';
const KEY_COUNTS = 'deposito3d.counts.v1';

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  loadInventory: () => read<Inventory>(KEY_INV),
  saveInventory: (inv: Inventory | null) => write(KEY_INV, inv),
  loadCounts: () => read<Record<string, string>>(KEY_COUNTS) ?? {},
  saveCounts: (c: Record<string, string>) => write(KEY_COUNTS, c),
};
