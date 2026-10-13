import { memo } from 'react';
import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { warehouseLayout } from '../config/warehouseLayout';
import { getLocationInfo, STATUS_META } from '../data/mockInventory';
import type { StorageLocation } from '../domain/types';
import { SCENE_COLORS } from './colors';

/** Píxeles de desplazamiento del mouse a partir de los cuales un clic se considera arrastre. */
export const DRAG_THRESHOLD = 5;

interface Props {
  location: StorageLocation;
  hovered: boolean;
  selected: boolean;
  colorByStatus: boolean;
  onSelect: (code: string) => void;
  onHoverStart: (code: string) => void;
  onHoverEnd: (code: string) => void;
}

const PALLET = { w: 1.2, d: 1.0, h: 0.15 };

/** Una ubicación (posición de paleta): carga visible + volumen seleccionable. */
export const StorageSlot = memo(function StorageSlot({
  location,
  hovered,
  selected,
  colorByStatus,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: Props) {
  const dim = warehouseLayout.rack;
  const info = getLocationInfo(location);
  const [x, yc, z] = location.position;
  const bottom = yc - dim.levelHeight / 2;
  // Las paletas apoyan sobre el larguero (salvo en el piso).
  const base = bottom > 0.001 ? bottom + dim.beamHeight / 2 : 0;
  const clearHeight = dim.levelHeight - dim.beamHeight - 0.2;

  const hasLoad = info.status === 'ocupada' || info.status === 'reservada';
  const fill = info.fillPercent / 100;
  const pallets = hasLoad ? (fill > 0.5 ? 2 : 1) : 0;
  const cargoH = Math.max(0.25, (clearHeight - PALLET.h) * Math.min(1, 0.45 + fill * 0.55));
  const cargoColor = colorByStatus
    ? STATUS_META[info.status].color
    : info.status === 'reservada'
      ? SCENE_COLORS.cargoReserved
      : SCENE_COLORS.cargo;

  // Volumen seleccionable (ligeramente más chico que el hueco).
  const boxW = dim.bayWidth - dim.uprightSize * 2 - 0.04;
  const boxH = dim.levelHeight - dim.beamHeight - 0.04;
  const boxY = base + boxH / 2;

  let overlayColor: string = SCENE_COLORS.hover;
  let overlayOpacity = 0;
  // En modo estado, la carga ya va coloreada; el volumen sólo se tiñe si está vacío.
  if (colorByStatus && !hasLoad) {
    overlayColor = STATUS_META[info.status].color;
    overlayOpacity = 0.35;
  }
  if (info.status === 'bloqueada' && !colorByStatus) {
    overlayColor = SCENE_COLORS.blocked;
    overlayOpacity = 0.22;
  }
  if (hovered) overlayOpacity = Math.max(overlayOpacity, 0.25);
  if (selected) {
    overlayColor = SCENE_COLORS.selected;
    overlayOpacity = 0.45;
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > DRAG_THRESHOLD) return;
    onSelect(location.code);
  };

  return (
    <group>
      {Array.from({ length: pallets }, (_, i) => {
        const px = pallets === 1 ? x : x + (i === 0 ? -0.66 : 0.66);
        return (
          <group key={i} position={[px, base, z]}>
            <mesh position={[0, PALLET.h / 2, 0]} castShadow receiveShadow raycast={() => null}>
              <boxGeometry args={[PALLET.w, PALLET.h, PALLET.d]} />
              <meshStandardMaterial color={SCENE_COLORS.palletWood} roughness={0.9} />
            </mesh>
            <mesh position={[0, PALLET.h + cargoH / 2, 0]} castShadow receiveShadow raycast={() => null}>
              <boxGeometry args={[PALLET.w - 0.05, cargoH, PALLET.d - 0.05]} />
              <meshStandardMaterial color={cargoColor} roughness={0.8} />
            </mesh>
          </group>
        );
      })}

      <mesh
        position={[x, boxY, z]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverStart(location.code);
        }}
        onPointerOut={() => onHoverEnd(location.code)}
      >
        <boxGeometry args={[boxW, boxH, dim.depth]} />
        <meshBasicMaterial
          color={overlayColor}
          transparent
          opacity={overlayOpacity}
          depthWrite={false}
        />
        {(selected || hovered) && (
          <Edges color={selected ? SCENE_COLORS.selected : SCENE_COLORS.hover} lineWidth={selected ? 2.5 : 1.5} />
        )}
      </mesh>
    </group>
  );
});
