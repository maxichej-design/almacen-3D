import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Aisle, RackLocation, Warehouse } from '../domain/types';
import { useStore } from '../state/store';
import type { CameraKeyframe } from './cameraPaths';
import { Label } from './Label';
import { CRATE, LOAD_MAPS, LOAD_ROUGHNESS, PALLET, palletVisuals, type PalletVisual } from './Loads';
import { SCENE } from './palette';
import { forkliftSideTexture, mastBrandTexture, palletTexture } from './textures';

/*
 * Apiladora retráctil Hangcha (batería de litio, proveedor Carbone), como la del depósito.
 * Coordenadas locales: +X = hacia donde apuntan las horquillas, Y arriba, Z al costado.
 * Medidas aproximadas: 1,1 m de ancho, ~2,3 m de largo, mástil plegado ~2,6 m (unos dos niveles);
 * llega al 6.º nivel.
 */
const BLACK = '#17191b';
const STEEL = '#26292c';
const BODY = { x0: -1.15, x1: -0.05, w: 1.1, h: 1.05 };
const LEGS = { x0: -0.1, x1: 0.9, h: 0.2, z: 0.47 };
const MAST_X = 0.1; // frente del mástil con el carro retraído
const MAST_H = 2.6;
const FORK = { x0: 0.08, len: 1.15 };
/** Centro del pallet sobre las horquillas, medido desde el mástil. */
const LOAD_CX = FORK.x0 + PALLET.d / 2;
const REACH_MAX = 0.65;
/** El pallet apoya 5 cm por debajo de la cara de arriba de las horquillas al entrar. */
const FORK_IN = 0.05;

const SPEED = 2.6; // m/s (más rápida que la real, para que la simulación no aburra)
const TURN = 1.8; // rad/s
const LIFT = 0.8; // m/s
const REACH = 0.6; // m/s

interface Pose {
  x: number;
  z: number;
  yaw: number;
  lift: number;
  reach: number;
}

interface Step {
  dur: number;
  t: number;
  started?: boolean;
  start?: () => void;
  run: (k: number) => void;
}

const smooth = (k: number) => k * k * (3 - 2 * k);
/** Ángulo de giro para que +X local apunte a la dirección (dx, dz) del mundo. */
const yawOf = (dx: number, dz: number) => Math.atan2(-dz, dx);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Arma la secuencia de pasos simulando la pose (todo determinístico). */
class Plan {
  steps: Step[] = [];
  constructor(
    public p: Pose,
    private live: Pose,
  ) {}

  private push(dur: number, from: Partial<Pose>, to: Partial<Pose>) {
    const live = this.live;
    const keys = Object.keys(to) as (keyof Pose)[];
    this.steps.push({
      dur,
      t: 0,
      run: (k) => {
        const e = smooth(k);
        for (const key of keys) live[key] = from[key]! + (to[key]! - from[key]!) * e;
      },
    });
    Object.assign(this.p, to);
  }

  call(fn: () => void) {
    this.steps.push({ dur: 0, t: 0, start: fn, run: () => {} });
  }

  turnTo(yaw: number) {
    const d = wrap(yaw - this.p.yaw);
    if (Math.abs(d) < 0.01) return;
    this.push(Math.max(0.25, Math.abs(d) / TURN), { yaw: this.p.yaw }, { yaw: this.p.yaw + d });
  }

  /** Avanza (o retrocede) en línea recta sin girar. */
  slideTo(x: number, z: number) {
    const dist = Math.hypot(x - this.p.x, z - this.p.z);
    if (dist < 0.02) return;
    this.push(Math.max(0.5, dist / SPEED + 0.3), { x: this.p.x, z: this.p.z }, { x, z });
  }

  /** Gira hacia el punto y va hasta él. */
  driveTo(x: number, z: number) {
    if (Math.hypot(x - this.p.x, z - this.p.z) < 0.02) return;
    this.turnTo(yawOf(x - this.p.x, z - this.p.z));
    this.slideTo(x, z);
  }

  liftTo(h: number) {
    const d = Math.abs(h - this.p.lift);
    if (d < 0.005) return;
    this.push(Math.max(0.35, d / LIFT), { lift: this.p.lift }, { lift: h });
  }

  reachTo(r: number) {
    const d = Math.abs(r - this.p.reach);
    if (d < 0.005) return;
    this.push(Math.max(0.4, d / REACH), { reach: this.p.reach }, { reach: r });
  }
}

const mainAisles = (wh: Warehouse) => wh.aisles.filter((a) => !a.cross);

function aisleAt(wh: Warehouse, z: number): Aisle | undefined {
  return mainAisles(wh).find((a) => z >= a.z0 - 0.4 && z <= a.z1 + 0.4);
}

/** Recorrido por el centro de los pasillos; para cambiar de pasillo cruza por el hall (pasillo transversal). */
function route(wh: Warehouse, p: Pose, target: Aisle, x: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const cur = aisleAt(wh, p.z);
  let z = p.z;
  if (cur && Math.abs(z - cur.centerZ) > 0.05) {
    z = cur.centerZ;
    pts.push([p.x, z]);
  }
  if (cur?.id !== target.id) {
    const t = wh.aisles.find((a) => a.cross);
    const tx = t ? (t.x0 + t.x1) / 2 - 0.4 : x;
    pts.push([tx, z], [tx, target.centerZ]);
  }
  pts.push([x, target.centerZ]);
  return pts;
}

/** Lugar de estacionamiento: al pie de D5.1, sobre el pasillo (foto 15/10). */
function parkingPose(wh: Warehouse): Pose {
  const loc = wh.locationIndex.get('D5.1');
  const aisle = loc && wh.aisles.find((a) => a.id === loc.aisleId);
  if (!loc || !aisle) {
    const a = mainAisles(wh)[0];
    return { x: (a.x0 + a.x1) / 2, z: a.centerZ, yaw: Math.PI, lift: 0.1, reach: 0 };
  }
  return { x: loc.position[0], z: aisle.centerZ, yaw: Math.PI, lift: 0.1, reach: 0 };
}

const noRaycast = () => null;

/** Un pallet con su carga. Origen: centro de la base; el lado de 1,2 m va sobre X local. */
function PalletModel({ v }: { v: PalletVisual }) {
  if (v.kind === 'cajon') {
    return (
      <mesh position={[0, CRATE.h / 2, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[CRATE.d, CRATE.h, CRATE.w]} />
        <meshStandardMaterial color={v.loadColor} map={LOAD_MAPS.cajon()} roughness={0.7} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh position={[0, PALLET.h / 2, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[PALLET.d, PALLET.h, PALLET.w]} />
        <meshStandardMaterial
          color={v.pallet === 'plastic' ? SCENE.palletPlastic : SCENE.palletWood}
          map={palletTexture()}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, PALLET.h + v.loadH / 2, 0]} castShadow raycast={noRaycast}>
        <boxGeometry args={[PALLET.d - 0.06, v.loadH, PALLET.w - 0.06]} />
        <meshStandardMaterial color={v.loadColor} map={LOAD_MAPS[v.kind]()} roughness={LOAD_ROUGHNESS[v.kind]} />
      </mesh>
    </group>
  );
}

function Box({
  size,
  position,
  color = BLACK,
  emissive,
  roughness = 0.55,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color?: string;
  emissive?: string;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow raycast={noRaycast}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={0.15}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 1.6 : 0}
      />
    </mesh>
  );
}

function Wheel({ position, r, w }: { position: [number, number, number]; r: number; w: number }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={noRaycast}>
      <cylinderGeometry args={[r, r, w, 20]} />
      <meshStandardMaterial color="#111" roughness={0.8} />
    </mesh>
  );
}

/** Chasis, puesto del operador y techo protector (lo que no se mueve con la elevación). */
function Chassis({ beacon }: { beacon: React.RefObject<THREE.MeshStandardMaterial | null> }) {
  const bx = (BODY.x0 + BODY.x1) / 2;
  const bl = BODY.x1 - BODY.x0;
  const gy = 2.2; // techo protector
  return (
    <group>
      {/* Cuerpo con batería: costados con el panel verde y la marca. */}
      <Box size={[bl, BODY.h - 0.1, BODY.w]} position={[bx, 0.08 + (BODY.h - 0.1) / 2, 0]} />
      {([1, -1] as const).map((s) => (
        <mesh
          key={s}
          position={[bx, 0.08 + (BODY.h - 0.1) / 2, s * (BODY.w / 2 + 0.002)]}
          rotation={[0, s > 0 ? 0 : Math.PI, 0]}
          raycast={noRaycast}
        >
          <planeGeometry args={[bl, BODY.h - 0.1]} />
          <meshStandardMaterial map={forkliftSideTexture(s < 0)} roughness={0.45} />
        </mesh>
      ))}
      {/* Tablero y respaldo del operador (va sentado de costado). */}
      <Box size={[0.32, 0.22, BODY.w - 0.1]} position={[BODY.x1 - 0.2, BODY.h + 0.08, 0]} color={STEEL} />
      <Box size={[0.42, 0.1, 0.42]} position={[-0.72, BODY.h + 0.05, -0.1]} color="#2b2b2b" roughness={0.9} />
      <Box size={[0.1, 0.5, 0.42]} position={[-0.95, BODY.h + 0.32, -0.1]} color="#2b2b2b" roughness={0.9} />
      {/* Techo protector: dos parantes atrás + marco con rejilla. */}
      {([1, -1] as const).map((s) => (
        <Box key={s} size={[0.08, gy - 0.6, 0.08]} position={[BODY.x0 + 0.1, 0.6 + (gy - 0.6) / 2, s * 0.48]} />
      ))}
      <Box size={[0.08, gy - BODY.h, 0.08]} position={[BODY.x1 - 0.05, BODY.h + (gy - BODY.h) / 2, 0.48]} />
      {([1, -1] as const).map((s) => (
        <Box key={`l${s}`} size={[bl + 0.05, 0.08, 0.08]} position={[bx, gy, s * 0.48]} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={`r${i}`} size={[0.05, 0.05, 0.96]} position={[BODY.x0 + 0.08 + i * 0.24, gy + 0.01, 0]} />
      ))}
      {/* Baliza naranja, luz roja y foco azul de seguridad. */}
      <mesh position={[BODY.x0 + 0.25, gy + 0.13, 0.32]} raycast={noRaycast}>
        <cylinderGeometry args={[0.07, 0.08, 0.18, 16]} />
        <meshStandardMaterial ref={beacon} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
      <Box size={[0.06, 0.08, 0.1]} position={[BODY.x1 - 0.02, gy + 0.08, 0.42]} color="#ef4444" emissive="#ef4444" />
      <mesh position={[BODY.x0 - 0.02, gy - 0.05, -0.5]} rotation={[0, 0, Math.PI / 2]} raycast={noRaycast}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.6} />
      </mesh>
      {/* Brazos portantes con ruedas de carga y rueda motriz. */}
      {([1, -1] as const).map((s) => (
        <group key={`b${s}`}>
          <Box size={[LEGS.x1 - LEGS.x0, LEGS.h, 0.13]} position={[(LEGS.x0 + LEGS.x1) / 2, LEGS.h / 2 + 0.03, s * LEGS.z]} />
          <Wheel position={[LEGS.x1 - 0.14, 0.12, s * LEGS.z]} r={0.12} w={0.1} />
        </group>
      ))}
      <Wheel position={[-0.75, 0.17, 0.25]} r={0.17} w={0.14} />
      <Wheel position={[-0.75, 0.17, -0.25]} r={0.12} w={0.1} />
      {/* Luces en el piso: línea roja a los costados (zona de peligro) y punto azul atrás. */}
      {([1, -1] as const).map((s) => (
        <mesh key={`z${s}`} position={[-0.3, 0.012, s * 0.95]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[1.6, 0.06]} />
          <meshBasicMaterial color="#ff2d2d" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[BODY.x0 - 1.4, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.75} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Mástil triple: los tramos internos suben cuando el carro supera la altura del mástil plegado. */
function Mast({
  outer,
  stage2,
  stage3,
  carriage,
  carry,
}: {
  outer: React.RefObject<THREE.Group | null>;
  stage2: React.RefObject<THREE.Group | null>;
  stage3: React.RefObject<THREE.Group | null>;
  carriage: React.RefObject<THREE.Group | null>;
  carry: PalletVisual | null;
}) {
  const rail = (z: number, w: number, x: number, key: string) => (
    <Box key={key} size={[0.1, MAST_H, w]} position={[x, 0.05 + MAST_H / 2, z]} color={BLACK} />
  );
  return (
    <group ref={outer} position={[MAST_X, 0, 0]}>
      {rail(0.4, 0.09, -0.07, 'o1')}
      {rail(-0.4, 0.09, -0.07, 'o2')}
      <Box size={[0.1, 0.12, 0.9]} position={[-0.07, MAST_H, 0]} />
      <Box size={[0.1, 0.1, 0.9]} position={[-0.07, 0.15, 0]} />
      <mesh position={[-0.07, 1.4, 0.4455]} raycast={noRaycast}>
        <planeGeometry args={[0.1, 1.1]} />
        <meshStandardMaterial map={mastBrandTexture()} />
      </mesh>
      <group ref={stage2}>
        {rail(0.32, 0.07, -0.04, 's21')}
        {rail(-0.32, 0.07, -0.04, 's22')}
        <Box size={[0.08, 0.1, 0.7]} position={[-0.04, MAST_H - 0.02, 0]} />
        <group ref={stage3}>
          {rail(0.25, 0.06, -0.01, 's31')}
          {rail(-0.25, 0.06, -0.01, 's32')}
          <Box size={[0.07, 0.1, 0.56]} position={[-0.01, MAST_H - 0.04, 0]} />
        </group>
      </group>
      {/* Carro portahorquillas: respaldo de carga y dos horquillas. */}
      <group ref={carriage}>
        <Box size={[0.06, 0.4, 0.95]} position={[0.03, 0.25, 0]} color={STEEL} />
        {[-0.42, -0.21, 0, 0.21, 0.42].map((z) => (
          <Box key={z} size={[0.04, 0.75, 0.04]} position={[0.04, 0.8, z]} color={STEEL} />
        ))}
        <Box size={[0.04, 0.05, 0.95]} position={[0.04, 1.18, 0]} color={STEEL} />
        {[-0.3, 0.3].map((z) => (
          <group key={z}>
            <Box size={[FORK.len, 0.045, 0.12]} position={[FORK.x0 + FORK.len / 2, 0.0225, z]} color="#1f2124" />
            <Box size={[0.045, 0.45, 0.12]} position={[FORK.x0 - 0.02, 0.225, z]} color="#1f2124" />
          </group>
        ))}
        {carry && (
          <group position={[LOAD_CX, -FORK_IN, 0]}>
            <PalletModel v={carry} />
          </group>
        )}
      </group>
    </group>
  );
}

/**
 * La apiladora del depósito. Estacionada al pie de D5.1; cuando se le pide un pallet va por los
 * pasillos, sube al nivel, lo saca, lo baja, lo deja en el piso del pasillo y se aleja.
 */
export function Forklift() {
  const wh = useStore((s) => s.warehouse);
  const request = useStore((s) => s.forklift.request);
  const lifted = useStore((s) => s.forklift.lifted);
  const onFloor = useStore((s) => s.forklift.onFloor);
  const busy = useStore((s) => s.forklift.status != null);
  const index = useStore((s) => s.index);
  const mode = useStore((s) => s.colorMode);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const clearHover = useStore((s) => s.clearHover);

  const park = useMemo(() => parkingPose(wh), [wh]);
  const pose = useRef<Pose>({ ...park });
  const queue = useRef<Step[]>([]);
  const [carry, setCarry] = useState<PalletVisual | null>(null);

  const root = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Group>(null);
  const stage2 = useRef<THREE.Group>(null);
  const stage3 = useRef<THREE.Group>(null);
  const carriage = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);

  /** Pallet que se está manipulando (para dibujarlo en el piso). */
  const liftedVisual = useMemo(() => {
    if (!lifted) return null;
    const loc = wh.locationIndex.get(lifted.code);
    const sum = index.byLocation.get(lifted.code);
    if (!loc || !sum) return null;
    const vs = palletVisuals(loc, sum, mode);
    return vs.find((v) => v.slot === lifted.slot) ?? vs[0];
  }, [lifted, wh, index, mode]);

  useEffect(() => {
    if (!request) return;
    const st = useStore.getState();
    const plan = new Plan({ ...pose.current }, pose.current);
    const status = (s: string | null) => plan.call(() => useStore.getState().setForklift({ status: s }));
    const fly = (path: CameraKeyframe[]) => plan.call(() => useStore.getState().flyTo(path));
    setCarry(null);

    if (request.action === 'home') {
      status('La apiladora vuelve a su lugar');
      plan.reachTo(0);
      plan.liftTo(0.1);
      const a = aisleAt(wh, park.z) ?? mainAisles(wh)[0];
      for (const [x, z] of route(wh, plan.p, a, park.x)) plan.driveTo(x, z);
      plan.turnTo(park.yaw);
      status(null);
      queue.current = plan.steps;
      return;
    }

    const { code, slot } = request.target;
    const loc: RackLocation | undefined = wh.locationIndex.get(code);
    const sum = st.index.byLocation.get(code);
    const aisle = loc && wh.aisles.find((a) => a.id === loc.aisleId);
    if (!loc || !sum || !aisle) {
      queue.current = [];
      return;
    }
    const vs = palletVisuals(loc, sum, st.colorMode);
    const v = vs.find((x) => x.slot === slot) ?? vs[0];
    const f = loc.facing;
    const az = aisle.centerZ;
    const locZ = loc.position[2];
    const px = v.x;
    // Frente a la estantería, a la distancia justa para que con el carro adelantado el pallet quede centrado.
    const zFront = locZ + f * (MAST_X + LOAD_CX + REACH_MAX);
    // El pallet se deja hacia el centro del pasillo, y la apiladora retrocede hacia el otro lado.
    const d = px < (aisle.x0 + aisle.x1) / 2 ? 1 : -1;
    const backOff = 3.5;
    const room = backOff + 1.4;
    const tx = d > 0 ? Math.max(px, aisle.x0 + room) : Math.min(px, aisle.x1 - room);
    const pickY = loc.baseY + FORK_IN;
    const levelTxt = loc.level === 1 ? 'Acomoda las horquillas en el piso' : `Sube al nivel ${loc.level}`;

    status(`Apiladora en camino a ${code}`);
    {
      const p = plan.p;
      const mx = (p.x + px) / 2;
      const mz = (p.z + az) / 2;
      const span = Math.max(8, Math.abs(p.x - px) + Math.abs(p.z - az));
      fly([{ target: [mx, 1, mz], position: [mx + span * 0.15, 6 + span * 0.45, mz - 6 - span * 0.5] }]);
    }
    plan.reachTo(0);
    plan.liftTo(0.1);
    for (const [x, z] of route(wh, plan.p, aisle, px)) plan.driveTo(x, z);

    fly([
      {
        target: [px, Math.max(1.2, loc.baseY * 0.7 + 0.6), (locZ + az) / 2],
        position: [px + d * 7.5, Math.max(3.4, loc.baseY + 1.6), az + f * 1.3],
        duration: 1.8,
      },
    ]);
    status(`Llegó a ${code}: se acomoda frente a la estantería`);
    plan.turnTo(yawOf(0, -f));
    plan.slideTo(px, zFront);
    status(levelTxt);
    plan.liftTo(pickY);
    status('Entra con las horquillas');
    plan.reachTo(REACH_MAX);
    plan.call(() => {
      setCarry(v);
      useStore.getState().setForklift({ lifted: { code, slot: v.slot } });
    });
    status('Levanta el pallet y lo saca');
    plan.liftTo(pickY + 0.12);
    plan.reachTo(0);
    status('Baja el pallet');
    plan.liftTo(0.3);
    plan.slideTo(px, az);
    plan.turnTo(yawOf(d, 0));
    plan.slideTo(tx, az);
    status('Lo apoya en el piso');
    plan.liftTo(FORK_IN);
    plan.call(() => {
      const p = pose.current;
      const r = MAST_X + p.reach + LOAD_CX;
      setCarry(null);
      useStore.getState().setForklift({
        onFloor: { x: p.x + Math.cos(p.yaw) * r, z: p.z - Math.sin(p.yaw) * r, yaw: p.yaw },
      });
    });
    status('Se aleja');
    plan.slideTo(tx - d * backOff, az);
    plan.liftTo(0.1);
    {
      const r = MAST_X + LOAD_CX;
      const fx = tx + d * r;
      fly([{ target: [fx, 0.6, az], position: [fx + d * 3.4, 2.7, az + f * 1.4], duration: 1.6 }]);
    }
    status(`Pallet de ${code} en el piso: tocalo para ver qué contiene`);
    queue.current = plan.steps;
  }, [request, wh, park]);

  useFrame((state, delta) => {
    let left = Math.min(delta, 0.1);
    const q = queue.current;
    while (q.length) {
      const s = q[0];
      if (!s.started) {
        s.started = true;
        s.start?.();
      }
      const use = Math.min(s.dur - s.t, left);
      s.t += use;
      left -= use;
      s.run(s.dur > 0 ? s.t / s.dur : 1);
      if (s.t >= s.dur) q.shift();
      else break;
    }
    const p = pose.current;
    if (root.current) {
      root.current.position.set(p.x, 0, p.z);
      root.current.rotation.y = p.yaw;
    }
    if (outer.current) outer.current.position.x = MAST_X + p.reach;
    // Mástil triple: los tramos internos acompañan al carro cuando pasa la altura plegada.
    const ext = Math.max(0, p.lift + 1.25 - MAST_H);
    if (stage2.current) stage2.current.position.y = ext / 2;
    if (stage3.current) stage3.current.position.y = ext / 2;
    if (carriage.current) carriage.current.position.y = p.lift;
    if (beacon.current) {
      const on = busy && Math.sin(state.clock.elapsedTime * 9) > 0;
      beacon.current.emissiveIntensity = on ? 3 : 0.5;
    }
  });

  return (
    <group>
      <group ref={root}>
        <Chassis beacon={beacon} />
        <Mast outer={outer} stage2={stage2} stage3={stage3} carriage={carriage} carry={carry} />
      </group>
      {onFloor && liftedVisual && lifted && (
        <group position={[onFloor.x, 0, onFloor.z]} rotation={[0, onFloor.yaw, 0]}>
          <PalletModel v={liftedVisual} />
          {/* Zona tocable (un poco más grande que el pallet). */}
          <mesh
            position={[0, (liftedVisual.loadH + PALLET.h) / 2, 0]}
            onClick={(e) => {
              e.stopPropagation();
              select({ kind: 'location', code: lifted.code });
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover({ kind: 'location', id: lifted.code });
            }}
            onPointerOut={() => clearHover({ kind: 'location', id: lifted.code })}
          >
            <boxGeometry args={[PALLET.d + 0.1, liftedVisual.loadH + PALLET.h + 0.1, PALLET.w + 0.1]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <FloorRing />
          <Billboard position={[0, liftedVisual.loadH + PALLET.h + 0.45, 0]}>
            <Label text={`${lifted.code} · tocá para ver`} position={[0, 0, 0]} height={0.2} color="#0f172a" background="#22d3ee" />
          </Billboard>
        </group>
      )}
    </group>
  );
}

/** Aro que late alrededor del pallet apoyado, para que se note dónde tocar. */
function FloorRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = (clock.elapsedTime * 0.8) % 1;
    m.scale.setScalar(1 + k * 0.5);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
  });
  return (
    <mesh ref={ref} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
      <ringGeometry args={[0.85, 0.95, 40]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
