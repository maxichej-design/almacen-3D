import { useMemo } from 'react';
import { ZONE_COLORS } from '../scene/Zones';
import { useStore } from '../state/store';

/** Plano 2D del depósito (vista desde arriba) para orientarse y saltar a una fila. */
export function Minimap() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const selection = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const { minX, maxX, minZ, maxZ } = wh.bounds;
  const W = maxX - minX;
  const D = maxZ - minZ;

  const occ = useMemo(
    () => new Map(wh.rows.map((r) => [r.id, r.locations.filter((l) => index.byLocation.has(l.code)).length / r.locations.length])),
    [wh, index],
  );

  // Puntos marcados: ubicación seleccionada o todas las de una pieza.
  const marks = useMemo(() => {
    const codes =
      selection?.kind === 'location' ? [selection.code]
      : selection?.kind === 'part' ? index.byPart.get(selection.partNumber)?.fifo.map((r) => r.location) ?? []
      : [];
    return codes
      .map((c) => {
        const l = wh.locationIndex.get(c);
        if (l) return [l.position[0], l.position[2]] as const;
        const z = wh.zoneIndex.get(c);
        return z ? ([z.x0 + z.w / 2, z.z0 + z.d / 2] as const) : null;
      })
      .filter((p) => p != null);
  }, [selection, wh, index]);

  // El plano se dibuja con X hacia la derecha y Z hacia abajo.
  return (
    <div className="minimap" aria-label="Plano del depósito">
      <svg viewBox={`${minX} ${minZ} ${W} ${D}`} preserveAspectRatio="xMidYMid meet">
        <rect x={minX} y={minZ} width={W} height={D} className="mm-floor" />
        {wh.zones.map((z) => (
          <rect
            key={z.code}
            x={z.x0}
            y={z.z0}
            width={z.w}
            height={z.d}
            fill={ZONE_COLORS[z.kind]}
            opacity={selection?.kind === 'zone' && selection.code === z.code ? 0.9 : 0.45}
            className="mm-hit"
            onClick={() => select({ kind: 'zone', code: z.code }, { fly: true })}
          >
            <title>{`${z.code} · ${z.name}`}</title>
          </rect>
        ))}
        {wh.rows.map((r) => {
          const sel = selection?.kind === 'row' && selection.id === r.id;
          return (
            <g key={r.id} className="mm-hit" onClick={() => select({ kind: 'row', id: r.id }, { fly: true })}>
              <rect x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} className={sel ? 'mm-row sel' : 'mm-row'} />
              <rect x={r.x0} y={r.z0} width={(r.x1 - r.x0) * (occ.get(r.id) ?? 0)} height={r.z1 - r.z0} className="mm-occ" />
              <text x={r.x1 + 0.8} y={(r.z0 + r.z1) / 2} className="mm-label">{r.id}</text>
              <title>{`Fila ${r.id} · ${Math.round((occ.get(r.id) ?? 0) * 100)}% ocupada`}</title>
            </g>
          );
        })}
        {marks.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={1.1} className="mm-mark" />
        ))}
      </svg>
    </div>
  );
}
