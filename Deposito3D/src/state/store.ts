import { create } from 'zustand';
import { layout } from '../config/layout';
import { QUALITY, type Quality } from '../config/visual';
import { buildDemoInventory } from '../data/demoInventory';
import { storage } from '../data/storage';
import { indexInventory, todayIso, type InventoryIndex } from '../domain/inventory';
import type { ColorMode, Inventory, Selection, Warehouse } from '../domain/types';
import { buildWarehouse, normalizeLocation } from '../domain/warehouse';
import {
  generalView,
  planView,
  viewForSelection,
  walkToLocation,
  type CameraKeyframe,
} from '../scene/cameraPaths';

/** Pallet identificado por ubicación y posición dentro del módulo (0 / 1). */
export interface PalletRef {
  code: string;
  slot: number;
}

/** Estado de la apiladora (simulación de bajar un pallet). */
export interface ForkliftState {
  /** Pedido actual (id cambia con cada pedido). */
  request: { id: number; action: 'fetch'; target: PalletRef } | { id: number; action: 'home' } | null;
  /** Texto de lo que está haciendo; null = estacionada. */
  status: string | null;
  /** Pallet sacado de la estantería (en las horquillas o en el piso). */
  lifted: PalletRef | null;
  /** Pallet apoyado en el piso del pasillo, listo para tocarlo. */
  onFloor: { x: number; z: number; yaw: number } | null;
}

export type PanelTab = 'detalle' | 'panel' | 'conteos' | 'datos';
export type Hover = { kind: 'location' | 'zone' | 'row'; id: string } | null;

interface AppState {
  warehouse: Warehouse;
  inventory: Inventory;
  /** Conteos registrados en esta PC: código de ubicación → fecha ISO. */
  counts: Record<string, string>;
  index: InventoryIndex;

  selection: Selection;
  hover: Hover;
  colorMode: ColorMode;
  tab: PanelTab;
  showLabels: boolean;
  /** Recorrido en primera persona activo. */
  walkMode: boolean;
  /** Pedido de movimiento de cámara (id cambia en cada pedido). */
  camera: { id: number; path: CameraKeyframe[] } | null;

  forklift: ForkliftState;
  /** Calidad gráfica (se recuerda en esta PC). */
  quality: Quality;
  setQuality: (q: Quality) => void;
  /** La calidad la eligió la persona (entonces no se baja sola). */
  qualityManual: boolean;
  /** Baja un nivel de calidad si la PC no llega a una animación fluida. */
  autoLowerQuality: () => void;
  /** Aviso breve en pantalla. */
  notice: string | null;
  setNotice: (n: string | null) => void;
  /** Manda la apiladora a bajar un pallet de la ubicación. */
  fetchPallet: (code: string) => void;
  /** Devuelve el pallet a su lugar y la apiladora a su posición. */
  parkForklift: () => void;
  setForklift: (patch: Partial<ForkliftState>) => void;

  /** Pantalla de inicio (menú) o la aplicación. */
  screen: 'inicio' | 'app';
  setScreen: (s: 'inicio' | 'app') => void;
  /** Terminal de simulación de QAD abierta (con una consulta inicial opcional). */
  qad: { open: boolean; program?: string; partNumber?: string; run?: boolean };
  openQad: (opts?: { program?: string; partNumber?: string; run?: boolean }) => void;
  closeQad: () => void;
  /** Demostración guiada en curso. */
  demo: boolean;
  setDemo: (v: boolean) => void;
  /** Transferencia de inventario (simulación tipo QAD 3.4.1). Devuelve un error o null. */
  transferStock: (t: { partNumber: string; from: string; ref?: string; to: string; qty: number }) => string | null;

  select: (sel: Selection, opts?: { fly?: boolean }) => void;
  setHover: (h: Hover) => void;
  clearHover: (h: Hover) => void;
  setColorMode: (m: ColorMode) => void;
  setTab: (t: PanelTab) => void;
  setShowLabels: (v: boolean) => void;
  setWalkMode: (v: boolean) => void;
  flyTo: (path: CameraKeyframe[]) => void;
  focusSelection: () => void;
  walkTo: (code: string) => void;
  setView: (v: 'general' | 'planta') => void;
  /** Carga un inventario. Devuelve false si no se pudo guardar en la PC (demasiado grande). */
  loadInventory: (inv: Inventory) => boolean;
  resetToDemo: () => void;
  registerCount: (code: string) => void;
}

const warehouse = buildWarehouse(layout);
const initialInventory = storage.loadInventory() ?? buildDemoInventory(warehouse);
const initialCounts = storage.loadCounts();
const savedQuality = storage.loadQuality();
const initialQuality: Quality = savedQuality && savedQuality in QUALITY ? (savedQuality as Quality) : 'alto';

export const useStore = create<AppState>((set, get) => ({
  warehouse,
  inventory: initialInventory,
  counts: initialCounts,
  index: indexInventory(initialInventory, warehouse, initialCounts),

  selection: null,
  hover: null,
  colorMode: 'ocupacion',
  tab: 'panel',
  showLabels: true,
  walkMode: false,
  camera: null,
  forklift: { request: null, status: null, lifted: null, onFloor: null },
  screen: 'inicio',
  setScreen: (screen) => set({ screen }),
  qad: { open: false },
  openQad: (opts) => set({ qad: { open: true, ...opts }, walkMode: false }),
  closeQad: () => set({ qad: { open: false } }),
  demo: false,
  setDemo: (demo) => set({ demo }),
  transferStock: ({ partNumber, from, ref, to, qty }) => {
    if (!(qty > 0)) return 'Cantidad inválida';
    const target = normalizeLocation(to);
    if (!warehouse.locationIndex.has(target) && !warehouse.zoneIndex.has(target)) return `Ubicación ${to} no existe`;
    const records = get().inventory.records.slice();
    const i = records.findIndex((r) => r.partNumber === partNumber && r.location === from && (!ref || r.ref === ref));
    if (i < 0) return 'No hay existencia en la ubicación de origen';
    const src = records[i];
    if (qty > src.qty) return `Existencia insuficiente (${src.qty})`;
    if (qty === src.qty) records.splice(i, 1);
    else records[i] = { ...src, qty: src.qty - qty };
    records.push({ ...src, location: target, qty });
    const inventory = { ...get().inventory, records };
    storage.saveInventory(inventory);
    set({ inventory, index: indexInventory(inventory, warehouse, get().counts) });
    return null;
  },
  quality: initialQuality,
  setQuality: (quality) => {
    storage.saveQuality(quality);
    set({ quality, qualityManual: true });
  },
  qualityManual: savedQuality != null,
  autoLowerQuality: () => {
    const { quality, qualityManual } = get();
    if (qualityManual) return;
    const order: Quality[] = ['ultra', 'alto', 'medio', 'bajo'];
    const next = order[order.indexOf(quality) + 1];
    if (!next) return;
    set({ quality: next, notice: `Gráficos en "${QUALITY[next].label}" para que el recorrido vaya fluido (se puede cambiar arriba).` });
  },
  notice: null,
  setNotice: (notice) => set({ notice }),

  fetchPallet: (code) => {
    const f = get().forklift;
    set({
      walkMode: false,
      forklift: { ...f, request: { id: (f.request?.id ?? 0) + 1, action: 'fetch', target: { code, slot: 0 } }, lifted: null, onFloor: null },
    });
  },
  parkForklift: () => {
    const f = get().forklift;
    set({ forklift: { ...f, request: { id: (f.request?.id ?? 0) + 1, action: 'home' }, lifted: null, onFloor: null } });
  },
  setForklift: (patch) => set({ forklift: { ...get().forklift, ...patch } }),

  select: (selection, opts) => {
    set({ selection, tab: selection ? 'detalle' : get().tab });
    if (opts?.fly && selection) get().flyTo(viewForSelection(warehouse, get().index, selection));
  },
  setHover: (hover) => set({ hover }),
  clearHover: (h) => {
    const cur = get().hover;
    if (cur && h && cur.kind === h.kind && cur.id === h.id) set({ hover: null });
  },
  setColorMode: (colorMode) => set({ colorMode }),
  setTab: (tab) => set({ tab }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setWalkMode: (walkMode) => set({ walkMode }),
  flyTo: (path) => {
    if (path.length) set((s) => ({ walkMode: false, camera: { id: (s.camera?.id ?? 0) + 1, path } }));
  },
  focusSelection: () => get().flyTo(viewForSelection(warehouse, get().index, get().selection)),
  walkTo: (code) => get().flyTo(walkToLocation(warehouse, code)),
  setView: (v) => get().flyTo(v === 'general' ? generalView(warehouse) : planView(warehouse)),

  loadInventory: (inventory) => {
    const saved = storage.saveInventory(inventory);
    // Un inventario nuevo trae sus propias fechas de conteo: se descartan los conteos locales.
    storage.saveCounts({});
    set({ inventory, counts: {}, index: indexInventory(inventory, warehouse, {}), selection: null });
    get().parkForklift();
    return saved;
  },
  resetToDemo: () => {
    storage.saveInventory(null);
    storage.saveCounts({});
    const inventory = buildDemoInventory(warehouse);
    set({ inventory, counts: {}, index: indexInventory(inventory, warehouse, {}), selection: null });
    get().parkForklift();
  },
  registerCount: (code) => {
    const counts = { ...get().counts, [code]: todayIso() };
    storage.saveCounts(counts);
    set({ counts, index: indexInventory(get().inventory, warehouse, counts) });
  },
}));
