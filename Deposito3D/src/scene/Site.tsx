import { useMemo } from 'react';
import * as THREE from 'three';
import { INJECTORS, MATERIALS_LAYOUT, MATERIALS_ROOM, OFFICE, PLANT, SITE_AREAS, SITE_BOUNDS, type SiteArea } from '../config/site';
import { Label } from './Label';
import { cageTexture, concreteMaps } from './pbr';
import { SCENE } from './palette';
import { blockTexture, corrugatedTexture } from './textures';

/*
 * Base de la planta completa alrededor del depósito: piso de la nave, áreas del plano general como
 * bloques con su nombre, inyectoras, oficina de supervisores y la sala de materiales (de su plano).
 * Es una primera base para ir detallando área por área (WIP, sala de materiales, despacho...).
 */

const noRaycast = () => null;
type R = { x: number; z: number; w: number; d: number };

function concreteFor(w: number, d: number) {
  const { color, rough } = concreteMaps();
  const c = color.clone();
  const r = rough.clone();
  for (const t of [c, r]) {
    t.repeat.set(w / 4, d / 4);
    t.needsUpdate = true;
  }
  return { c, r };
}

function FlatLabel({ text, x, z, y = 0.05, h = 1.4, color = '#0f172a', bg = '#f8fafc' }: { text: string; x: number; z: number; y?: number; h?: number; color?: string; bg?: string }) {
  return <Label text={text} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} height={h} color={color} background={bg} />;
}

function Area({ a }: { a: SiteArea }) {
  const cx = a.x + a.w / 2;
  const cz = a.z + a.d / 2;
  return (
    <group>
      <mesh position={[cx, 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[a.w, a.d]} />
        <meshStandardMaterial color={a.color} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {a.h > 0.1 && (
        <mesh position={[cx, a.h / 2, cz]} raycast={noRaycast}>
          <boxGeometry args={[a.w, a.h, a.d]} />
          <meshStandardMaterial color={a.color} transparent opacity={0.35} roughness={0.8} depthWrite={false} />
        </mesh>
      )}
      <FlatLabel text={a.name.toUpperCase()} x={cx} z={cz} y={a.h + 0.05} h={Math.min(2.2, Math.max(1, a.d / 5))} />
    </group>
  );
}

/** Pared simple de bloques + chapa (como el depósito). `cut` = baja, para poder mirar. */
function Wall({ x0, z0, x1, z1, h, cut }: { x0: number; z0: number; x1: number; z1: number; h: number; cut?: boolean }) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const vertical = x0 === x1;
  const hh = cut ? 0.6 : h;
  const sheet = useMemo(() => {
    const t = corrugatedTexture().clone();
    t.repeat.set(Math.max(1, len / 4), 1);
    t.needsUpdate = true;
    return t;
  }, [len]);
  const blocks = useMemo(() => {
    const t = blockTexture().clone();
    t.repeat.set(len / 0.8, Math.min(2.4, hh) / 0.4);
    t.needsUpdate = true;
    return t;
  }, [len, hh]);
  const base = Math.min(2.4, hh);
  const pos = (y: number, hgt: number): [number, number, number] => [(x0 + x1) / 2, y + hgt / 2, (z0 + z1) / 2];
  const size = (hgt: number): [number, number, number] => (vertical ? [0.2, hgt, len] : [len, hgt, 0.2]);
  return (
    <group>
      <mesh position={pos(0, base)} receiveShadow raycast={noRaycast}>
        <boxGeometry args={size(base)} />
        <meshStandardMaterial color={SCENE.wallBlock} map={blocks} roughness={0.95} />
      </mesh>
      {hh > base && (
        <mesh position={pos(base, hh - base)} receiveShadow raycast={noRaycast}>
          <boxGeometry args={size(hh - base)} />
          <meshStandardMaterial color={SCENE.wallSheet} map={sheet} roughness={0.55} />
        </mesh>
      )}
    </group>
  );
}

function Cage({ r, fill, label }: { r: R; fill: string; label?: string }) {
  const h = 1.0;
  return (
    <group position={[r.x + r.w / 2, 0, r.z + r.d / 2]}>
      <mesh position={[0, h / 2, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[r.w, h, r.d]} />
        <meshStandardMaterial map={cageTexture()} alphaTest={0.5} side={THREE.DoubleSide} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[r.w * 0.8, 0.7, r.d * 0.8]} />
        <meshStandardMaterial color={fill} roughness={0.85} />
      </mesh>
      {label && <Label text={label} position={[0, h + 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} height={0.22} />}
    </group>
  );
}

function Silo({ r, n }: { r: R; n: number }) {
  const H = 3.6;
  const rad = Math.min(r.w, r.d) * 0.42;
  const cols: [number, number][] = [
    [-r.w / 2 + 0.06, -r.d / 2 + 0.06],
    [r.w / 2 - 0.06, -r.d / 2 + 0.06],
    [-r.w / 2 + 0.06, r.d / 2 - 0.06],
    [r.w / 2 - 0.06, r.d / 2 - 0.06],
  ];
  return (
    <group position={[r.x + r.w / 2, 0, r.z + r.d / 2]}>
      {cols.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, H / 2, z]} castShadow raycast={noRaycast}>
          <boxGeometry args={[0.08, H, 0.08]} />
          <meshStandardMaterial color="#facc15" roughness={0.45} metalness={0.3} />
        </mesh>
      ))}
      {/* Tolva: cilindro arriba y cono abajo. */}
      <mesh position={[0, 2.6, 0]} castShadow raycast={noRaycast}>
        <cylinderGeometry args={[rad, rad, 1.8, 24]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow raycast={noRaycast}>
        <cylinderGeometry args={[rad, 0.12, 0.8, 24]} />
        <meshStandardMaterial color="#b6c0cc" metalness={0.7} roughness={0.3} />
      </mesh>
      <Label text={`SILO ${n}`} position={[0, H + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} height={0.3} background="#facc15" />
    </group>
  );
}

function MaterialsRoom() {
  const m = MATERIALS_ROOM;
  const L = MATERIALS_LAYOUT;
  const floor = useMemo(() => concreteFor(m.w, m.d), [m.w, m.d]);
  const x1 = m.x + m.w;
  const z1 = m.z + m.d;
  return (
    <group>
      <mesh position={[m.x + m.w / 2, 0.003, m.z + m.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[m.w, m.d]} />
        <meshStandardMaterial color="#ffffff" map={floor.c} roughnessMap={floor.r} roughness={0.62} />
      </mesh>
      <Wall x0={m.x} z0={z1} x1={x1} z1={z1} h={6} />
      <Wall x0={x1} z0={m.z} x1={x1} z1={z1} h={6} />
      <Wall x0={m.x} z0={m.z} x1={x1} z1={m.z} h={6} cut />
      {L.cagesMaterial.map((r, i) => (
        <Cage key={`m${i}`} r={r} fill="#d6c7a1" label={i < 6 ? 'MATERIAL' : undefined} />
      ))}
      {L.cagesTablero.map((r, i) => (
        <Cage key={`t${i}`} r={r} fill="#8b9bb0" label={i < 5 ? 'TABLERO' : undefined} />
      ))}
      {L.bins.map((r, i) => (
        <mesh key={`b${i}`} position={[r.x + r.w / 2, 0.45, r.z + r.d / 2]} castShadow raycast={noRaycast}>
          <cylinderGeometry args={[Math.min(r.w, r.d) * 0.45, Math.min(r.w, r.d) * 0.42, 0.9, 20]} />
          <meshStandardMaterial color="#2563eb" roughness={0.5} />
        </mesh>
      ))}
      {L.silosBottom.map((r, i) => (
        <Silo key={`sb${i}`} r={r} n={i + 1} />
      ))}
      {L.silosTop.map((r, i) => (
        <Silo key={`st${i}`} r={r} n={i + 9} />
      ))}
      {[...L.walkways, ...L.bagWalkways].map((r, i) => (
        <mesh key={`w${i}`} position={[r.x + r.w / 2, 0.008, r.z + r.d / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[r.w, r.d]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[L.machine.x + L.machine.w / 2, 1.3, L.machine.z + L.machine.d / 2]} castShadow raycast={noRaycast}>
        <boxGeometry args={[L.machine.w, 2.6, L.machine.d]} />
        <meshStandardMaterial color="#cfd6de" roughness={0.5} metalness={0.3} />
      </mesh>
      <Label
        text="EQUIPO (a confirmar)"
        position={[L.machine.x + L.machine.w / 2, 2.65, L.machine.z + L.machine.d / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        height={0.35}
      />
      {L.bags.map((r, i) => (
        <Bags key={`g${i}`} r={r} />
      ))}
      <FlatLabel text="SALA DE MATERIALES" x={m.x + m.w / 2} z={m.z + m.d / 2} y={0.02} h={1.1} color="#0f172a" bg="#e2e8f0" />
      <Label text="SALA DE MATERIALES" position={[m.x + m.w / 2, 6.6, z1 - 0.15]} height={0.9} background="#0f172a" color="#facc15" />
    </group>
  );
}

/** Bolsas de material apiladas (bloques amarillos del plano). */
function Bags({ r }: { r: R }) {
  const items = useMemo(() => {
    const out: [number, number][] = [];
    const n = Math.max(1, Math.floor(r.w / 0.55));
    const k = Math.max(1, Math.floor(r.d / 0.55));
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out.push([r.x + (i + 0.5) * (r.w / n), r.z + (j + 0.5) * (r.d / k)]);
    return out;
  }, [r]);
  return (
    <group>
      {items.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.28, z]} castShadow raycast={noRaycast}>
          <boxGeometry args={[0.48, 0.55, 0.48]} />
          <meshStandardMaterial color={i % 3 ? '#e9c84a' : '#d9b638'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Office() {
  const o = OFFICE;
  const x1 = o.x + o.w;
  const z1 = o.z + o.d;
  return (
    <group>
      <mesh position={[o.x + o.w / 2, 0.004, o.z + o.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[o.w, o.d]} />
        <meshStandardMaterial color="#d6d3cd" roughness={0.6} />
      </mesh>
      <Wall x0={o.x} z0={z1} x1={x1} z1={z1} h={o.h} />
      <Wall x0={o.x} z0={o.z} x1={x1} z1={o.z} h={o.h} cut />
      <FlatLabel text="OFICINA DE SUPERVISORES" x={o.x + o.w / 2} z={o.z + o.d / 2} y={0.02} h={1.0} />
    </group>
  );
}

function Injectors() {
  return (
    <group>
      {INJECTORS.map((r, i) => (
        <group key={i} position={[r.x + r.w / 2, 0, r.z + r.d / 2]}>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow raycast={noRaycast}>
            <boxGeometry args={[r.w, 2.4, r.d * 0.62]} />
            <meshStandardMaterial color="#2f9e44" roughness={0.5} metalness={0.25} />
          </mesh>
          <mesh position={[0, 1.6, r.d * 0.36]} castShadow raycast={noRaycast}>
            <boxGeometry args={[r.w * 0.55, 1.4, r.d * 0.28]} />
            <meshStandardMaterial color="#1f7a35" roughness={0.5} metalness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Site() {
  const b = SITE_BOUNDS;
  const plant = useMemo(() => concreteFor(PLANT.w, PLANT.d), []);
  return (
    <group>
      {/* Terreno alrededor y piso de la nave. */}
      <mesh position={[(b.minX + b.maxX) / 2, -0.03, (b.minZ + b.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[b.maxX - b.minX + 40, b.maxZ - b.minZ + 40]} />
        <meshStandardMaterial color="#9ea3a8" roughness={0.95} />
      </mesh>
      <mesh position={[PLANT.x + PLANT.w / 2, -0.018, PLANT.z + PLANT.d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[PLANT.w, PLANT.d]} />
        <meshStandardMaterial color="#ffffff" map={plant.c} roughnessMap={plant.r} roughness={0.65} />
      </mesh>
      {SITE_AREAS.map((a) => (
        <Area key={a.id} a={a} />
      ))}
      <Injectors />
      <Office />
      <MaterialsRoom />
    </group>
  );
}
