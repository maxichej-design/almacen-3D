import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { warehouseLayout } from '../config/warehouseLayout';
import { pad2 } from '../domain/generateWarehouse';
import type { Rack } from '../domain/types';
import { useWarehouse } from '../state/WarehouseContext';
import { SCENE_COLORS } from './colors';
import { Label } from './Label';
import { DRAG_THRESHOLD, StorageSlot } from './StorageSlot';

/** Estructura de una fila de estanterías (parantes + largueros) y sus ubicaciones. */
export function RackModel({ rack }: { rack: Rack }) {
  const {
    selection,
    select,
    hoveredCode,
    setHoveredCode,
    hoveredRackId,
    setHoveredRackId,
    colorByStatus,
  } = useWarehouse();
  const dim = warehouseLayout.rack;
  const [ox, , oz] = rack.origin;
  const length = rack.bays * dim.bayWidth;
  const levelsTop = dim.firstLevelHeight + rack.levels * dim.levelHeight;
  const uprightH = levelsTop + 0.3;
  const us = dim.uprightSize;
  const frontZ = rack.facing === 1 ? oz + dim.depth : oz;

  const rackSelected = selection?.kind === 'rack' && selection.id === rack.id;
  const frameHover = hoveredRackId === rack.id;
  const uprightColor = rackSelected
    ? SCENE_COLORS.frameSelected
    : frameHover
      ? SCENE_COLORS.frameHover
      : SCENE_COLORS.upright;
  const beamColor = rackSelected ? SCENE_COLORS.frameSelected : SCENE_COLORS.beam;

  // Alturas de largueros: uno por nivel (salvo el piso) más el superior.
  const beamYs: number[] = [];
  for (let k = 0; k <= rack.levels; k++) {
    const y = dim.firstLevelHeight + k * dim.levelHeight;
    if (y > 0.001) beamYs.push(y);
  }

  const onSelectLocation = useCallback((code: string) => select({ kind: 'location', code }), [select]);
  const onHoverStart = useCallback((code: string) => setHoveredCode(code), [setHoveredCode]);
  const onHoverEnd = useCallback(
    (code: string) => setHoveredCode((prev) => (prev === code ? null : prev)),
    [setHoveredCode],
  );

  const onFrameClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > DRAG_THRESHOLD) return;
    select({ kind: 'rack', id: rack.id });
  };

  // El texto mira hacia el pasillo.
  const labelRotY = rack.facing === 1 ? 0 : Math.PI;
  const labelZ = frontZ + rack.facing * 0.02;

  return (
    <group>
      {/* Estructura: clic sobre parantes/largueros selecciona la estantería completa */}
      <group
        onClick={onFrameClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredRackId(rack.id);
        }}
        onPointerOut={() => setHoveredRackId((prev) => (prev === rack.id ? null : prev))}
      >
        {Array.from({ length: rack.bays + 1 }, (_, i) => {
          const x = ox + i * dim.bayWidth;
          return (
            <group key={`u${i}`}>
              {[oz + us / 2, oz + dim.depth - us / 2].map((z) => (
                <mesh key={z} position={[x, uprightH / 2, z]} castShadow>
                  <boxGeometry args={[us, uprightH, us]} />
                  <meshStandardMaterial color={uprightColor} metalness={0.3} roughness={0.5} />
                </mesh>
              ))}
              {/* Travesaños laterales del bastidor */}
              {[0.3, uprightH * 0.5, uprightH - 0.2].map((y) => (
                <mesh key={y} position={[x, y, oz + dim.depth / 2]}>
                  <boxGeometry args={[0.04, 0.04, dim.depth - us]} />
                  <meshStandardMaterial color={uprightColor} metalness={0.3} roughness={0.5} />
                </mesh>
              ))}
            </group>
          );
        })}

        {beamYs.map((y) =>
          [oz + us / 2, oz + dim.depth - us / 2].map((z) => (
            <mesh key={`b${y}-${z}`} position={[ox + length / 2, y, z]} castShadow>
              <boxGeometry args={[length, dim.beamHeight, 0.05]} />
              <meshStandardMaterial color={beamColor} metalness={0.2} roughness={0.55} />
            </mesh>
          )),
        )}
      </group>

      {/* Protectores rojos al pie de las cabeceras */}
      {[ox - 0.08, ox + length + 0.08].map((x) => (
        <mesh key={`g${x}`} position={[x, 0.2, oz + dim.depth / 2]} castShadow raycast={() => null}>
          <boxGeometry args={[0.1, 0.4, dim.depth + 0.12]} />
          <meshStandardMaterial color={SCENE_COLORS.guard} roughness={0.5} />
        </mesh>
      ))}

      {/* Carteles: número de módulo arriba y nivel en el primer parante */}
      {Array.from({ length: rack.bays }, (_, i) => (
        <Label
          key={`l${i}`}
          text={pad2(i + 1)}
          position={[ox + (i + 0.5) * dim.bayWidth, levelsTop + 0.3, labelZ]}
          rotation={[0, labelRotY, 0]}
          height={0.3}
          background="#f8fafc"
        />
      ))}
      {Array.from({ length: rack.levels }, (_, i) => (
        <Label
          key={`n${i}`}
          text={`N${i + 1}`}
          position={[
            rack.facing === 1 ? ox - 0.25 : ox + length + 0.25,
            dim.firstLevelHeight + (i + 0.5) * dim.levelHeight,
            labelZ,
          ]}
          rotation={[0, labelRotY, 0]}
          height={0.26}
          background="#f8fafc"
        />
      ))}
      <Label
        text={rack.id}
        position={[rack.facing === 1 ? ox + length + 0.6 : ox - 0.6, levelsTop + 0.3, labelZ]}
        rotation={[0, labelRotY, 0]}
        height={0.4}
        background="#1d4ed8"
        color="#ffffff"
      />

      {rack.locations.map((loc) => (
        <StorageSlot
          key={loc.code}
          location={loc}
          hovered={hoveredCode === loc.code}
          selected={selection?.kind === 'location' && selection.code === loc.code}
          colorByStatus={colorByStatus}
          onSelect={onSelectLocation}
          onHoverStart={onHoverStart}
          onHoverEnd={onHoverEnd}
        />
      ))}
    </group>
  );
}
