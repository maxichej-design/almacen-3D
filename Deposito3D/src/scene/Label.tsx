import { textTexture } from './textures';

interface Props {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  color?: string;
  background?: string;
}

const noRaycast = () => null;

/** Cartel plano de texto (canvas, funciona sin internet). */
export function Label({ text, position, rotation = [0, 0, 0], height = 0.4, color, background }: Props) {
  const { texture, aspect } = textTexture(text, color, background);
  return (
    <mesh position={position} rotation={rotation} raycast={noRaycast}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
