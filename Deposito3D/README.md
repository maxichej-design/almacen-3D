# Deposito3D

Gemelo digital del almacén: el stock visto en 3D, ubicación por ubicación, para que
**inventario** tenga un control más fino (FIFO, conteo cíclico, obsoletos, ocupación).

> Prototipo. Mientras no se cargue un reporte real, los datos son **de demostración**.
> El layout sigue el plano de ingeniería; las letras de las filas, el sentido de numeración y la
> ubicación de Recepción / WIP / Expedición están a confirmar.

## Qué hace

- **Depósito 3D según el plano de ingeniería:** 7 filas (A–G; letras tentativas), módulos de 2 posiciones
  de pallet y 6 niveles, 2 pasillos longitudinales + 1 transversal, sector Moldes. Códigos de ubicación tipo `C5.1`
  (fila C, módulo 5, nivel 1 = piso). Zonas: Recepción, **W0WIP** (armado), Expedición, F1, L1, Q1 (posición a confirmar).
- **Buscador único:** ubicación (`C5.1`), fila (`C`), zona (`W0WIP`) o número de parte / descripción.
- **Ir caminando:** la cámara entra por la cabecera del pasillo y camina hasta la ubicación.
- **Recorrer:** modo primera persona (W A S D / flechas, arrastrar para mirar, botones en pantalla).
- **FIFO:** al buscar una pieza se marcan todas sus ubicaciones numeradas por antigüedad (FIFO 1 = sale primero).
- **Ver por:** realista · clase ABC · antigüedad del stock · estado de conteo cíclico.
- **Conteo cíclico:** frecuencia por clase (A 60 d, B 90 d, C 120 d; D = obsoleta, se revisa para baja),
  lista de vencidos / por vencer, **planilla CSV** para salir a contar y registro del conteo.
- **Tablero:** ocupación, clasificación ABC, antigüedad, conteos, stock más antiguo, ubicaciones del reporte que no existen en el layout.
- **Datos:** importar el reporte de stock (**.xlsx** o **.csv**) con detección automática de columnas
  (Ubicación, Producto, Cantidad, Tipo ABC, Fecha de ingreso, Lote, Último conteo, Dónde se usa).
  Los datos quedan guardados en esa PC. `.xlsb` no se lee: guardarlo como `.xlsx` o `.csv`.
- Minimapa (plano 2D), carteles, panel adaptable a celular.

## Cómo abrirlo

**Sin instalar nada:** abrir `Deposito3D.html` con doble clic (Chrome o Edge).
Se genera con `npm run build:standalone`.

**Modo desarrollo** (para seguir programando), con Node.js 20+:

```bash
cd Deposito3D
npm install      # solo la primera vez
npm run dev      # http://localhost:5173, se recarga solo al guardar
```

En Windows también: doble clic en `INICIAR.bat`.

Otros comandos: `npm run typecheck`, `npm run build`, `npm run preview`.

## Estructura del código

```
src/
  config/layout.ts            ← LAYOUT: filas, módulos, niveles, medidas, zonas (ajustar con ingeniería)
  config/policies.ts          ← reglas: frecuencia de conteo por clase, tramos de antigüedad
  domain/types.ts             ← tipos: ubicación, fila, zona, registro de stock, selección
  domain/warehouse.ts         ← arma la geometría y normaliza códigos ("c05.01" → "C5.1")
  domain/inventory.ts         ← índices: por ubicación, por pieza (FIFO), estado de conteo
  data/demoInventory.ts       ← datos de demostración
  data/import/                ← lector .xlsx (fflate) y .csv, detección de columnas
  data/storage.ts             ← guardado local (se reemplaza por servidor en la etapa "en línea")
  state/store.ts              ← estado de la app (zustand): selección, modo de color, cámara
  scene/                      ← 3D (React Three Fiber)
    WarehouseScene.tsx  Building.tsx  Racks.tsx  Loads.tsx  Zones.tsx
    LocationPicker.tsx  Highlights.tsx  CameraRig.tsx  WalkControls.tsx  cameraPaths.ts
  ui/                         ← interfaz: barra, buscador, leyenda, minimapa, paneles
    panels/ DetailPanel  Dashboard  CountsPanel  DataPanel
```

### Cambios habituales

- **Layout:** editar `src/config/layout.ts` — cada fila con su letra, posición (x, z en metros desde la
  esquina superior izquierda del plano), cantidad de módulos, hacia qué pasillo mira y huecos vacíos; pasillos y zonas como rectángulos.
- **Frecuencias de conteo:** `src/config/policies.ts`.
- **Conexión en línea (QAD) a futuro:** reemplazar `data/storage.ts` y la carga de `Inventory` por llamadas a un servidor;
  la escena y los paneles trabajan sobre el mismo modelo `StockRecord`.

## Hoja de ruta

1. **Prototipo (actual):** 3D, búsqueda, FIFO, conteo cíclico, tablero, carga por reporte.
2. **Layout real:** plano de ingeniería, nomenclatura y medidas exactas.
3. **En línea:** servidor común + conexión con QAD (movimientos y descuentos en vivo).
4. **Planta completa:** WIP y preproducción en 3D, más tableros y reportes.
