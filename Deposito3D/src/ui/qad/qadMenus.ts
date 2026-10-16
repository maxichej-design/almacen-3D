/** Menús de QAD tal como aparecen en la terminal del almacén (videos del 15/10). */

export interface MenuItem {
  n: number;
  label: string;
}

const items = (labels: Record<number, string>, from: number, to: number): MenuItem[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ n: from + i, label: labels[from + i] ?? '' }));

/** Menú principal: DISTRIBUCION (1–12), MANUFACTURING (13–24), FINANCIAL (25–36). */
export const MAIN_MENU: MenuItem[] = items(
  {
    1: 'Productos/Almacenes',
    2: 'Direcciones/Impuesto',
    3: 'Control Inventario',
    5: 'Compras',
    7: 'Ventas/Facturación',
    12: 'Plan de Distribución',
    13: 'Estructuras Producto',
    14: 'Rutas/Centro Trabajo',
    18: 'Fabric. Repetitiva',
    22: 'Previs/Plan Maestro',
    23: 'MRP-Plan de Material',
    28: 'Gestión de Pagos',
    29: 'Localizaciones Argen',
    34: 'Otto Krause Customiz',
    35: 'EDI',
    36: 'Admin del Sistema',
  },
  1,
  36,
);

export const MENUS: Record<string, { title: string; items: MenuItem[] }> = {
  '3': {
    title: 'Control Inventario',
    items: items(
      {
        1: 'MENU Detalle de Inventario',
        2: 'CONS Detalle Invent por Producto',
        3: 'CONS Det Inventario por Almacén',
        4: 'MENU Transferencias Inventario',
        5: 'Salidas Material por Garantía',
        6: 'MENU Listados Inventario',
        7: 'Salidas - No Planificadas',
        8: 'Salidas - Devolución a Proveedor',
        9: 'Recepciones - No Planificadas',
        10: 'Recepciones - Devoluciones OV',
        12: 'Recepciones - Devol a Stock',
      },
      1,
      12,
    ),
  },
  '3.4': {
    title: 'MENU Transferencias Inventario',
    items: items({ 1: 'Transferencia - Artículo Único' }, 1, 1),
  },
};

/** Programas simulados (los demás números muestran "no disponible"). */
export const PROGRAMS: Record<string, { title: string; file: string }> = {
  '3.2': { title: 'CONS Detalle Invent por Producto', file: 'icloiq01.p b+' },
  '3.3': { title: 'CONS Det Inventario por Almacén', file: 'simulación' },
  '3.4.1': { title: 'Transferencia - Artículo Único', file: 'simulación' },
};
