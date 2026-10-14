import { walkInput } from '../scene/walkInput';
import { useStore } from '../state/store';

type Axis = 'forward' | 'turn' | 'strafe';

/** Controles en pantalla del modo recorrido (sirven con mouse y en pantallas táctiles). */
export function WalkHud() {
  const walkMode = useStore((s) => s.walkMode);
  const setWalkMode = useStore((s) => s.setWalkMode);
  if (!walkMode) return null;

  const hold = (axis: Axis, value: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      walkInput[axis] = value;
    },
    onPointerUp: () => (walkInput[axis] = 0),
    onPointerCancel: () => (walkInput[axis] = 0),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="walk-hud">
      <div className="walk-help">
        <b>Recorrido</b> · W A S D o flechas para caminar · arrastrar para mirar · Shift corre · Esc sale
      </div>
      <div className="walk-pad" aria-label="Controles de recorrido">
        <span />
        <button {...hold('forward', 1)} aria-label="Avanzar">▲</button>
        <span />
        <button {...hold('turn', 1)} aria-label="Girar a la izquierda">⟲</button>
        <button {...hold('forward', -1)} aria-label="Retroceder">▼</button>
        <button {...hold('turn', -1)} aria-label="Girar a la derecha">⟳</button>
      </div>
      <button className="walk-exit" onClick={() => setWalkMode(false)}>Salir del recorrido</button>
    </div>
  );
}
