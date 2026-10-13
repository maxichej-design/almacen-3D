import type { LoadType } from '../data/mockInventory';
import { SCENE_COLORS } from './colors';
import { cardboardTexture, crateTexture, kltTexture, palletTexture } from './textures';

export const PALLET = { w: 1.2, d: 1.0, h: 0.15 };
const CRATE = { w: 1.2, d: 0.9, h: 0.78 };

interface Props {
  type: LoadType;
  /** Altura disponible para la carga sobre el pallet. */
  cargoHeight: number;
  /** Color forzado (modo "colorear por estado"). */
  tint?: string;
  /** Variación visual reproducible. */
  variant: number;
}

const noRaycast = () => null;

/** Una unidad de carga (pallet + mercadería) apoyada en y = 0. */
export function LoadModel({ type, cargoHeight, tint, variant }: Props) {
  if (type === 'cajon-verde') {
    return (
      <mesh position={[0, CRATE.h / 2, 0]} castShadow receiveShadow raycast={noRaycast}>
        <boxGeometry args={[CRATE.w, CRATE.h, CRATE.d]} />
        <meshStandardMaterial color={tint ?? SCENE_COLORS.greenCrate} map={crateTexture()} roughness={0.7} />
      </mesh>
    );
  }

  const plasticPallet = type === 'pallet-plastico' || type === 'klt';
  const cargo = {
    carton: { color: variant % 2 ? SCENE_COLORS.cargo : SCENE_COLORS.cargoAlt, map: cardboardTexture() },
    'pallet-plastico': { color: SCENE_COLORS.cargoAlt, map: cardboardTexture() },
    klt: { color: SCENE_COLORS.klt, map: kltTexture() },
    film: { color: SCENE_COLORS.wrapped, map: cardboardTexture() },
  }[type];

  return (
    <group>
      <mesh position={[0, PALLET.h / 2, 0]} castShadow receiveShadow raycast={noRaycast}>
        <boxGeometry args={[PALLET.w, PALLET.h, PALLET.d]} />
        <meshStandardMaterial
          color={plasticPallet ? SCENE_COLORS.palletPlastic : SCENE_COLORS.palletWood}
          map={palletTexture()}
          roughness={plasticPallet ? 0.5 : 0.9}
        />
      </mesh>
      <mesh position={[0, PALLET.h + cargoHeight / 2, 0]} castShadow receiveShadow raycast={noRaycast}>
        <boxGeometry args={[PALLET.w - 0.06, cargoHeight, PALLET.d - 0.06]} />
        <meshStandardMaterial
          color={tint ?? cargo.color}
          map={cargo.map}
          roughness={type === 'film' ? 0.35 : 0.85}
          transparent={type === 'film'}
          opacity={type === 'film' ? 0.92 : 1}
        />
      </mesh>
    </group>
  );
}
