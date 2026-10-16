import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../state/store';

/**
 * Iluminación industrial sin techo visible:
 * - Entorno (reflejos) generado por código para los metales, el film y el piso.
 * - Luz cenital principal con sombras suaves (simula las filas de luminarias del techo).
 * - Luz ambiente de cielo/piso para que los pasillos no queden oscuros.
 * - Algunas luces puntuales sobre los pasillos, sin sombras, para dar "pozos" de luz.
 */
export function Lighting({ span, cx, cz, shadowMap }: { span: number; cx: number; cz: number; shadowMap: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const aisles = useStore((s) => s.warehouse.aisles);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.95;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  // Luminarias simuladas: 3 por pasillo principal, a 9 m de altura.
  const lamps = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const a of aisles) {
      if (a.cross) continue;
      for (const t of [0.2, 0.5, 0.8]) out.push([a.x0 + (a.x1 - a.x0) * t, 9, a.centerZ]);
    }
    return out;
  }, [aisles]);

  return (
    <>
      <hemisphereLight args={['#f4f7fb', '#6f757c', 0.45]} />
      <directionalLight
        position={[cx + span * 0.12, span * 0.9, cz + span * 0.08]}
        intensity={2.3}
        color="#fffaf2"
        castShadow
        key={shadowMap}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-left={-span * 0.6}
        shadow-camera-right={span * 0.6}
        shadow-camera-top={span * 0.6}
        shadow-camera-bottom={-span * 0.6}
        shadow-camera-far={span * 3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <object3D attach="target" position={[cx, 0, cz]} />
      </directionalLight>
      {lamps.map((p, i) => (
        <pointLight key={i} position={p} intensity={45} distance={22} decay={2} color="#f2f6ff" />
      ))}
    </>
  );
}
