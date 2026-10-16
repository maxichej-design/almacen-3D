import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';

/*
 * Demostración guiada para presentar el proyecto: recorre las funciones principales sola,
 * con un texto explicativo en cada paso. Se puede detener en cualquier momento.
 */

interface Step {
  text: string;
  /** Acción del paso; devuelve cuánto esperar (ms) o una promesa que termina cuando corresponde. */
  run: (ctx: Ctx) => number | Promise<void>;
}

interface Ctx {
  /** Pieza con más ubicaciones (buena para mostrar FIFO). */
  part: string;
  /** Ubicación en estantería de esa pieza (la que sale primero). */
  loc: string;
  stopped: () => boolean;
}

const s = () => useStore.getState();

function waitUntil(cond: () => boolean, ctx: Ctx, maxMs: number) {
  return new Promise<void>((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (ctx.stopped() || cond() || Date.now() - t0 > maxMs) resolve();
      else setTimeout(tick, 250);
    };
    tick();
  });
}

const STEPS: Step[] = [
  {
    text: 'Deposito3D: el almacén de la planta en 3D, con sus 7 filas de estanterías, portones y la apiladora.',
    run: () => {
      s().setColorMode('ocupacion');
      s().setTab('panel');
      s().setView('general');
      return 6500;
    },
  },
  {
    text: 'Cada ubicación muestra su carga real. Ver por clase ABC: azul = alta rotación, gris = obsoletos (D).',
    run: () => {
      s().setColorMode('abc');
      return 6000;
    },
  },
  {
    text: 'Antigüedad del stock: lo más viejo se ve enseguida, para respetar el FIFO.',
    run: () => {
      s().setColorMode('antiguedad');
      return 6000;
    },
  },
  {
    text: 'Conteo cíclico: en rojo las ubicaciones con el conteo vencido (A cada 60 días, B 90, C 120).',
    run: () => {
      s().setColorMode('conteo');
      s().setTab('conteos');
      return 7000;
    },
  },
  {
    text: 'Buscar un número de parte: aparecen todas sus ubicaciones y cuál tiene que salir primero (FIFO).',
    run: (c) => {
      s().setColorMode('ocupacion');
      s().select({ kind: 'part', partNumber: c.part }, { fly: true });
      return 8000;
    },
  },
  {
    text: 'La ficha de la ubicación: pieza, cantidad, lote, tarima, fecha de ingreso, FIFO y próximo conteo.',
    run: (c) => {
      s().select({ kind: 'location', code: c.loc }, { fly: true });
      return 7000;
    },
  },
  {
    text: 'La apiladora va a buscar el pallet, lo saca de la estantería y lo deja en el piso del pasillo.',
    run: (c) => {
      s().fetchPallet(c.loc);
      return waitUntil(() => s().forklift.onFloor != null && (s().forklift.status ?? '').includes('tocalo'), c, 90000);
    },
  },
  {
    text: 'Tocando el pallet se ve qué contiene. Después vuelve a su lugar.',
    run: (c) => {
      s().select({ kind: 'location', code: c.loc });
      return 6000;
    },
  },
  {
    text: 'La misma información que en QAD: la consulta 3.2 por producto. Con un clic en una línea se ve en el 3D.',
    run: (c) => {
      s().parkForklift();
      s().openQad({ program: '3.2', partNumber: c.part, run: true });
      return 9000;
    },
  },
  {
    text: 'Recorrido a pie: camina por el pasillo hasta quedar frente a la ubicación.',
    run: (c) => {
      s().closeQad();
      s().walkTo(c.loc);
      return 11000;
    },
  },
  {
    text: 'Tablero del inventario: ocupación, conteos, clases ABC y antigüedad. Los datos se actualizan con el reporte de QAD.',
    run: () => {
      s().setTab('panel');
      s().setView('general');
      return 7000;
    },
  },
];

export function Demo() {
  const demo = useStore((st) => st.demo);
  const setDemo = useStore((st) => st.setDemo);
  const [step, setStep] = useState(0);
  const stop = useRef(false);

  useEffect(() => {
    if (!demo) return;
    stop.current = false;
    const st = s();
    // Pieza con más ubicaciones en estantería.
    let best = { part: '', loc: '', n: 0 };
    for (const p of st.index.byPart.values()) {
      const inRack = p.fifo.filter((r) => st.warehouse.locationIndex.has(r.location));
      if (inRack.length > best.n) best = { part: p.partNumber, loc: inRack[0].location, n: inRack.length };
    }
    const ctx: Ctx = { part: best.part, loc: best.loc, stopped: () => stop.current };
    (async () => {
      for (let i = 0; i < STEPS.length && !stop.current; i++) {
        setStep(i);
        const r = STEPS[i].run(ctx);
        if (typeof r === 'number') await waitUntil(() => false, ctx, r);
        else await r;
      }
      if (!stop.current) {
        s().setColorMode('ocupacion');
        setDemo(false);
      }
    })();
    return () => {
      stop.current = true;
    };
  }, [demo, setDemo]);

  if (!demo) return null;
  return (
    <div className="demo-bar" role="status">
      <div className="demo-step">
        Demo · {step + 1}/{STEPS.length}
      </div>
      <div className="demo-text">{STEPS[step]?.text}</div>
      <button
        onClick={() => {
          stop.current = true;
          s().closeQad();
          setDemo(false);
        }}
      >
        Detener
      </button>
    </div>
  );
}
