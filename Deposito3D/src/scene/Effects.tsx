import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { QUALITY } from '../config/visual';
import { useStore } from '../state/store';

/**
 * Efectos de imagen según la calidad elegida (como las opciones gráficas de un juego):
 * oclusión ambiental (sombras de contacto), brillo suave, suavizado de bordes y viñeta.
 * En calidad Baja/Media no se usa el compositor y el renderer hace el tone mapping directo.
 */
export function Effects() {
  const quality = useStore((s) => s.quality);
  const q = QUALITY[quality];
  if (!q.ao && !q.bloom && !q.vignette) return null;
  return (
    <EffectComposer key={quality} multisampling={0}>
      <>{q.ao && <N8AO aoRadius={0.9} distanceFalloff={0.6} intensity={2.2} quality={quality === 'ultra' ? 'high' : 'medium'} halfRes={quality !== 'ultra'} />}</>
      <>{q.bloom && <Bloom luminanceThreshold={0.92} luminanceSmoothing={0.15} intensity={0.35} mipmapBlur />}</>
      <>{q.vignette && <Vignette offset={0.32} darkness={0.38} />}</>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <>{q.smaa && <SMAA />}</>
    </EffectComposer>
  );
}
