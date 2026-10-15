import { useStore } from '../state/store';

/** Estado de la apiladora mientras baja un pallet, con la opción de terminar. */
export function ForkliftHud() {
  const status = useStore((s) => s.forklift.status);
  const lifted = useStore((s) => s.forklift.lifted);
  const onFloor = useStore((s) => s.forklift.onFloor);
  const select = useStore((s) => s.select);
  const park = useStore((s) => s.parkForklift);
  if (!status && !onFloor) return null;
  return (
    <div className="fork-hud" role="status">
      <span className="fork-status">🏗️ {status ?? 'Pallet en el piso'}</span>
      {onFloor && lifted && (
        <button onClick={() => select({ kind: 'location', code: lifted.code })}>Ver contenido</button>
      )}
      <button onClick={park}>{lifted ? 'Guardar pallet' : 'Cancelar'}</button>
    </div>
  );
}
