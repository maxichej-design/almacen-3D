import { useMemo, useRef, useState } from 'react';
import { normalizeLocation } from '../domain/warehouse';
import type { Selection } from '../domain/types';
import { useStore } from '../state/store';

interface Result {
  key: string;
  title: string;
  subtitle: string;
  selection: Selection;
}

/** Buscador único: ubicación (C5.1), fila (C), zona (W0WIP) o número de parte / descripción. */
export function Search() {
  const wh = useStore((s) => s.warehouse);
  const index = useStore((s) => s.index);
  const select = useStore((s) => s.select);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<Result[]>(() => {
    const query = q.trim();
    if (!query) return [];
    const out: Result[] = [];
    const code = normalizeLocation(query);
    const loc = wh.locationIndex.get(code);
    if (loc) {
      const sum = index.byLocation.get(code);
      out.push({
        key: `l-${code}`,
        title: code,
        subtitle: sum ? `Ubicación · ${sum.partCount} pieza(s)` : 'Ubicación libre',
        selection: { kind: 'location', code },
      });
    }
    const row = wh.rowIndex.get(query.toUpperCase());
    if (row) out.push({ key: `r-${row.id}`, title: `Fila ${row.id}`, subtitle: row.aisleName, selection: { kind: 'row', id: row.id } });
    for (const z of wh.zones) {
      if (z.code.startsWith(query.toUpperCase()) || z.name.toLowerCase().includes(query.toLowerCase())) {
        out.push({ key: `z-${z.code}`, title: z.code, subtitle: z.name, selection: { kind: 'zone', code: z.code } });
      }
    }
    const lq = query.toLowerCase();
    for (const p of index.byPart.values()) {
      if (out.length > 12) break;
      if (p.partNumber.toLowerCase().includes(lq) || p.description?.toLowerCase().includes(lq)) {
        out.push({
          key: `p-${p.partNumber}`,
          title: p.partNumber,
          subtitle: `${p.description ?? 'Pieza'} · ${p.fifo.length} ubic.`,
          selection: { kind: 'part', partNumber: p.partNumber },
        });
      }
    }
    return out;
  }, [q, wh, index]);

  const choose = (r: Result) => {
    select(r.selection, { fly: true });
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        ref={inputRef}
        value={q}
        placeholder="Buscar ubicación (C5.1), pieza o zona…"
        aria-label="Buscar"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          else if (e.key === 'Enter' && results[active]) choose(results[active]);
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="empty">Sin resultados</li>}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                className={i === active ? 'active' : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <b>{r.title}</b>
                <span>{r.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
