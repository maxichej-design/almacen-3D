import { create } from 'zustand';
import { layout } from '../config/layout';
import { buildDemoInventory } from '../data/demoInventory';
import { storage } from '../data/storage';
import { indexInventory, todayIso, type InventoryIndex } from '../domain/inventory';
import type { ColorMode, Inventory, Selection, Warehouse } from '../domain/types';
import { buildWarehouse } from '../domain/warehouse';
import {
  generalView,
  planView,
  viewForSelection,
  walkToLocation,
  type CameraKeyframe,
} from '../scene/cameraPaths';

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
  /** Pedido de movimiento de cámara (id cambia en cada pedido). */
  camera: { id: number; path: CameraKeyframe[] } | null;

  select: (sel: Selection, opts?: { fly?: boolean }) => void;
  setHover: (h: Hover) => void;
  clearHover: (h: Hover) => void;
  setColorMode: (m: ColorMode) => void;
  setTab: (t: PanelTab) => void;
  setShowLabels: (v: boolean) => void;
  flyTo: (path: CameraKeyframe[]) => void;
  focusSelection: () => void;
  walkTo: (code: string) => void;
  setView: (v: 'general' | 'planta') => void;
  loadInventory: (inv: Inventory) => void;
  resetToDemo: () => void;
  registerCount: (code: string) => void;
}

const warehouse = buildWarehouse(layout);
const initialInventory = storage.loadInventory() ?? buildDemoInventory(warehouse);
const initialCounts = storage.loadCounts();

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
  camera: null,

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
  flyTo: (path) => {
    if (path.length) set((s) => ({ camera: { id: (s.camera?.id ?? 0) + 1, path } }));
  },
  focusSelection: () => get().flyTo(viewForSelection(warehouse, get().index, get().selection)),
  walkTo: (code) => get().flyTo(walkToLocation(warehouse, code)),
  setView: (v) => get().flyTo(v === 'general' ? generalView(warehouse) : planView(warehouse)),

  loadInventory: (inventory) => {
    storage.saveInventory(inventory);
    // Un inventario nuevo trae sus propias fechas de conteo: se descartan los conteos locales.
    storage.saveCounts({});
    set({ inventory, counts: {}, index: indexInventory(inventory, warehouse, {}), selection: null });
  },
  resetToDemo: () => {
    storage.saveInventory(null);
    storage.saveCounts({});
    const inventory = buildDemoInventory(warehouse);
    set({ inventory, counts: {}, index: indexInventory(inventory, warehouse, {}), selection: null });
  },
  registerCount: (code) => {
    const counts = { ...get().counts, [code]: todayIso() };
    storage.saveCounts(counts);
    set({ counts, index: indexInventory(get().inventory, warehouse, counts) });
  },
}));
