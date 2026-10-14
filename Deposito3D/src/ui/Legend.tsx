import { COLOR_MODES, legendFor } from '../scene/palette';
import { useStore } from '../state/store';

/** Referencias de color del modo actual, flotando sobre la vista 3D. */
export function Legend() {
  const mode = useStore((s) => s.colorMode);
  const title = COLOR_MODES.find((m) => m.id === mode)?.label;
  return (
    <div className="legend-box" aria-label="Referencias">
      <span className="legend-title">{title}</span>
      <ul className="legend">
        {legendFor(mode).map((l) => (
          <li key={l.label}>
            <span className="swatch" style={{ background: l.color }}>
              {l.icon}
            </span>
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
