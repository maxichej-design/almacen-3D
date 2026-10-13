import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface LabelProps {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Alto del cartel en metros; el ancho se ajusta al texto. */
  height?: number;
  color?: string;
  background?: string;
}

/**
 * Cartel de texto plano dibujado en un canvas.
 * No requiere descargar fuentes, por lo que funciona sin conexión a internet.
 */
export function Label({
  text,
  position,
  rotation = [0, 0, 0],
  height = 0.4,
  color = '#111827',
  background = '#facc15',
}: LabelProps) {
  const { texture, aspect } = useMemo(() => {
    const px = 128;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `bold ${px * 0.62}px system-ui, Arial, sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width + px * 0.6);
    canvas.width = w;
    canvas.height = px;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, px);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, px / 2 + px * 0.03);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { texture: tex, aspect: w / px };
  }, [text, color, background]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation} raycast={() => null}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
