import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { warehouseLayout } from '../config/warehouseLayout';
import { generateWarehouse } from '../domain/generateWarehouse';
import type { Selection, WarehouseModel } from '../domain/types';

/** Pedido de movimiento de cámara: hacia dónde mirar y desde dónde. */
export interface CameraRequest {
  id: number;
  target: [number, number, number];
  position: [number, number, number];
}

export type ViewPreset = 'general' | 'planta' | 'frente';

interface WarehouseState {
  model: WarehouseModel;
  selection: Selection;
  select: (s: Selection) => void;
  hoveredCode: string | null;
  setHoveredCode: Dispatch<SetStateAction<string | null>>;
  hoveredRackId: string | null;
  setHoveredRackId: Dispatch<SetStateAction<string | null>>;
  colorByStatus: boolean;
  setColorByStatus: (v: boolean) => void;
  cameraRequest: CameraRequest | null;
  /** Centra la cámara en la selección actual o en la indicada. */
  focusSelection: (target?: Selection) => void;
  setView: (v: ViewPreset) => void;
}

const Ctx = createContext<WarehouseState | null>(null);

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const model = useMemo(() => generateWarehouse(warehouseLayout), []);
  const [selection, setSelection] = useState<Selection>(null);
  const currentSelection = selection;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hoveredRackId, setHoveredRackId] = useState<string | null>(null);
  const [colorByStatus, setColorByStatus] = useState(false);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(null);

  const requestCamera = useCallback(
    (target: [number, number, number], position: [number, number, number]) =>
      setCameraRequest((prev) => ({ id: (prev?.id ?? 0) + 1, target, position })),
    [],
  );

  const setView = useCallback(
    (v: ViewPreset) => {
      const { minX, maxX, minZ, maxZ, height } = model.bounds;
      const span = Math.max(maxX - minX, maxZ - minZ);
      if (v === 'general') requestCamera([0, height * 0.3, 0], [span * 0.75, span * 0.6, span * 0.85]);
      if (v === 'planta') requestCamera([0, 0, 0], [0, span * 1.4, 0.01]);
      if (v === 'frente') requestCamera([0, height * 0.4, 0], [maxX + span * 0.9, height * 0.8, 0]);
    },
    [model, requestCamera],
  );

  const focusSelection = useCallback(
    (target?: Selection) => {
    const selection = target ?? currentSelection;
    if (!selection) return;
    if (selection.kind === 'location') {
      const loc = model.locationsByCode.get(selection.code);
      if (!loc) return;
      const rack = model.racksById.get(loc.rackId)!;
      const [x, y, z] = loc.position;
      // Cámara dentro del pasillo (sin invadir la fila de enfrente), en diagonal.
      const { depth } = warehouseLayout.rack;
      const dz = depth / 2 + warehouseLayout.aisleWidth * 0.75;
      requestCamera([x, y, z], [x + 3.5, y + 1, z + rack.facing * dz]);
    } else {
      const rack = model.racksById.get(selection.id);
      if (!rack) return;
      const midZ = rack.origin[2] + warehouseLayout.rack.depth / 2;
      const h = model.bounds.height;
      // Vista elevada sobre el pasillo para que no la tapen otras filas.
      const length = rack.bays * warehouseLayout.rack.bayWidth;
      requestCamera([0, h / 2, midZ], [length * 0.35, h * 2.4, midZ + rack.facing * 9]);
    }
  },
    [currentSelection, model, requestCamera],
  );

  const value: WarehouseState = {
    model,
    selection,
    select: setSelection,
    hoveredCode,
    setHoveredCode,
    hoveredRackId,
    setHoveredRackId,
    colorByStatus,
    setColorByStatus,
    cameraRequest,
    focusSelection,
    setView,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWarehouse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWarehouse debe usarse dentro de <WarehouseProvider>');
  return ctx;
}
