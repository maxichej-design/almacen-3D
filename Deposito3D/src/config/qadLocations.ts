/**
 * Ubicaciones de QAD que NO son estanterías del modelo 3D (listado de ubicaciones del almacén 5715,
 * exportado de QAD el 16/10/2026). El stock que esté en ellas se muestra como "fuera del 3D" en vez de
 * figurar como código desconocido. Las estanterías (a1.1 … g12.6) y W0.WIP están en el layout.
 */
export type QadLocGroup =
  | 'despacho'
  | 'materia-prima'
  | 'calidad'
  | 'proveedor'
  | 'expedicion'
  | 'wip'
  | 'transito'
  | 'otros';

export const QAD_GROUP_LABEL: Record<QadLocGroup, string> = {
  despacho: 'Despacho',
  'materia-prima': 'Materia prima',
  calidad: 'Calidad / obsoletos / diferencias',
  proveedor: 'Proveedor',
  expedicion: 'Expedición / facturación',
  wip: 'Traspaso a WIP',
  transito: 'En tránsito',
  otros: 'Otros',
};

/** Grupos que no cuentan para el FIFO del almacén (no es stock disponible en estantería). */
export const OUTSIDE_FIFO_GROUPS: QadLocGroup[] = ['despacho', 'calidad', 'expedicion', 'wip', 'transito', 'proveedor'];

export interface QadLocation {
  /** Código tal como figura en QAD. */
  code: string;
  desc: string;
  /** Estado de inventario en QAD (GENERAL, INSPEC, SCRAP, PRESHIP). */
  status: string;
  group: QadLocGroup;
}

export const QAD_LOCATIONS: QadLocation[] = [
  { code: '00050326', desc: 'Proveedor KZ', status: 'GENERAL', group: 'proveedor' },
  { code: '00050427', desc: 'Proveedor Novax', status: 'GENERAL', group: 'proveedor' },
  { code: '00050503', desc: 'Proveedor Franci', status: 'GENERAL', group: 'proveedor' },
  { code: '00050805', desc: 'BALDI', status: 'GENERAL', group: 'proveedor' },
  { code: '00051107', desc: 'BALDI', status: 'GENERAL', group: 'proveedor' },
  { code: '00061993', desc: 'Proveedor Barack', status: 'GENERAL', group: 'proveedor' },
  { code: '00062026', desc: 'Proveedor Plastitek', status: 'GENERAL', group: 'proveedor' },
  { code: '00062042', desc: 'Proveedor Aladdin', status: 'GENERAL', group: 'proveedor' },
  { code: '00062180', desc: 'Proveedor ABS', status: 'GENERAL', group: 'proveedor' },
  { code: '05896', desc: 'Locksley', status: 'GENERAL', group: 'proveedor' },
  { code: 'A0', desc: 'Mat. en Transito', status: 'PRESHIP', group: 'transito' },
  { code: 'A1.QC', desc: 'Mat. en Recepcion Otto', status: 'INSPEC', group: 'calidad' },
  { code: 'A2.QC', desc: 'Mat. no Conforme Otto K', status: 'SCRAP', group: 'calidad' },
  { code: 'alero', desc: 'Alero lateral', status: 'GENERAL', group: 'otros' },
  { code: 'AT2TA', desc: 'Testori', status: 'GENERAL', group: 'proveedor' },
  { code: 'depab', desc: 'deposito airbag m59', status: 'GENERAL', group: 'otros' },
  { code: 'dif', desc: 'ubicacion de diferencia', status: 'SCRAP', group: 'calidad' },
  { code: 'dr.wip', desc: 'Ubic de traspaso a WIP', status: 'GENERAL', group: 'wip' },
  { code: 'EK7KA', desc: 'Ubicacion SAS', status: 'GENERAL', group: 'proveedor' },
  { code: 'f1', desc: 'Despacho P21', status: 'GENERAL', group: 'despacho' },
  { code: 'fifo', desc: 'Problema de FIFO', status: 'SCRAP', group: 'calidad' },
  { code: 'H1', desc: 'Despacho X67', status: 'GENERAL', group: 'despacho' },
  { code: 'I1', desc: 'Despacho IP M69', status: 'GENERAL', group: 'despacho' },
  { code: 'J1', desc: 'Despacho IP RPU', status: 'GENERAL', group: 'despacho' },
  { code: 'jaula', desc: 'jaula de almacen', status: 'GENERAL', group: 'otros' },
  { code: 'K1', desc: 'Despacho IP Tarek', status: 'GENERAL', group: 'despacho' },
  { code: 'L1', desc: 'Materias primas', status: 'GENERAL', group: 'materia-prima' },
  { code: 'M1', desc: 'Guanteras RPU-Taos', status: 'GENERAL', group: 'despacho' },
  { code: 'N1', desc: 'Despacho DP RPU', status: 'GENERAL', group: 'despacho' },
  { code: 'noprodu', desc: 'Material no productivo', status: 'SCRAP', group: 'calidad' },
  { code: 'O1', desc: 'Desp Switch Bezel Ford', status: 'GENERAL', group: 'despacho' },
  { code: 'obsoleto', desc: 'piezas obsoletas', status: 'GENERAL', group: 'calidad' },
  { code: 'P1', desc: 'Despacho DP Ford', status: 'GENERAL', group: 'despacho' },
  { code: 'pa', desc: 'Deposito materia prima', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa1', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa10', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa11', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa12', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa13', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa14', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa15', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa16', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa17', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa18', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa19', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa2', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa20', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa21', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa22', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa23', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa24', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa25', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa26', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa27', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa28', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa29', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa3', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa30', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa31', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa32', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa4', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa5', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa6', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa7', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa8', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'pa9', desc: 'Estanteria materia prim', status: 'GENERAL', group: 'materia-prima' },
  { code: 'porton1', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton10', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton2', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton3', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton4', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton5', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton6', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton7', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton8', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'porton9', desc: 'Ubicacion obsoleto', status: 'GENERAL', group: 'calidad' },
  { code: 'Q1', desc: 'Desp Cup Bezel Ford', status: 'GENERAL', group: 'despacho' },
  { code: 'R1', desc: 'IP GM', status: 'GENERAL', group: 'despacho' },
  { code: 'S1', desc: 'DP M59 - Consola GM', status: 'GENERAL', group: 'despacho' },
  { code: 'T1', desc: 'Garnish GM', status: 'GENERAL', group: 'despacho' },
  { code: 'U1', desc: 'DP GM', status: 'GENERAL', group: 'despacho' },
  { code: 'VWZP7', desc: 'Ubicacion PRE invoice', status: 'GENERAL', group: 'expedicion' },
  { code: 'W1', desc: 'Despacho DP Taos', status: 'GENERAL', group: 'despacho' },
  { code: 'W9.SHIP', desc: 'Material para despacho', status: 'GENERAL', group: 'despacho' },
  { code: 'Y1', desc: 'Despacho miscelaneos PS', status: 'GENERAL', group: 'despacho' },
  { code: 'Z1', desc: 'Despacho miscelaneos VW', status: 'GENERAL', group: 'despacho' },
];
