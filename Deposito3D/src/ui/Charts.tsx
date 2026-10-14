import { fmtNum } from './format';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
  icon?: string;
  /** Texto del tooltip. */
  tip?: string;
  onClick?: () => void;
}

/**
 * Barras horizontales finas con etiqueta directa del valor.
 * Una sola escala (cero a la izquierda), color = identidad o estado de cada categoría.
 */
export function BarList({ data, unit, max }: { data: BarDatum[]; unit?: string; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="barlist">
      {data.map((d) => (
        <li key={d.label}>
          <button
            className="bar-row"
            data-tip={d.tip ?? `${d.label}: ${fmtNum(d.value)}${unit ? ` ${unit}` : ''}`}
            onClick={d.onClick}
            disabled={!d.onClick}
          >
            <span className="bar-label">
              {d.icon && (
                <span className="swatch sm" style={{ background: d.color }}>
                  {d.icon}
                </span>
              )}
              {d.label}
            </span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(d.value / top) * 100}%`, background: d.color }} />
            </span>
            <span className="bar-value">{fmtNum(d.value)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Tarjeta con un número destacado. */
export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'bad' | 'warn' | 'good' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
