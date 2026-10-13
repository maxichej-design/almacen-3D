# Deposito3D

Prototipo de aplicación web para representar y gestionar visualmente un depósito
industrial con un modelo 3D interactivo.

> **Etapa 1 – prototipo visual.** Los datos de inventario son ficticios. No hay todavía
> importación de Excel, base de datos, movimientos de stock ni integración con la fábrica.

## Tecnologías

| Pieza | Para qué |
|---|---|
| [Vite](https://vite.dev) | Servidor de desarrollo con recarga automática (HMR) y build |
| React + TypeScript | Interfaz y tipado para que el proyecto crezca ordenado |
| Three.js + [React Three Fiber](https://r3f.docs.pmnd.rs) | Render 3D declarativo con componentes React |
| [@react-three/drei](https://drei.docs.pmnd.rs) | Utilidades 3D (controles de cámara, bordes de selección) |

No hay otras dependencias. Los carteles 3D se dibujan con canvas, así que la app
funciona sin conexión a internet (no descarga fuentes ni texturas).

## Requisitos

- Node.js 20 o superior (probado con Node 22)

## Cómo ejecutarlo

```bash
cd Deposito3D
npm install      # solo la primera vez
npm run dev
```

Abrí en el navegador **http://localhost:5173**.
Cada vez que se guarda un archivo, el navegador se actualiza solo.

Como el servidor escucha en la red (`host: true`), también se puede abrir desde
otra PC o celular de la misma red con `http://<IP-de-esta-PC>:5173`
(la consola de `npm run dev` muestra la dirección).

Otros comandos:

- `npm run typecheck` – verifica tipos.
- `npm run build` – genera la versión compilada en `dist/`.
- `npm run preview` – sirve la versión compilada.

## Uso

- **Rotar:** arrastrar con botón izquierdo · **Desplazar:** botón derecho · **Zoom:** rueda.
- **Táctil:** un dedo rota, dos dedos hacen zoom y desplazan.
- **Clic en un hueco** de la estantería → selecciona la ubicación.
- **Clic en la estructura** (parantes/largueros) → selecciona la estantería completa,
  con un mapa de sus ubicaciones en el panel.
- **Clic en el vacío** → quita la selección.
- **Buscador:** escribir un código (`P1-I-03-2`) o una estantería (`P2-D`) y Enter.
- **Vistas:** General, Planta (desde arriba) y Cabecera. "Centrar vista" acerca la cámara a la selección.
- **Colorear por estado:** pinta las ubicaciones según ocupada / libre / reservada / bloqueada.

### Codificación de ubicaciones

`P1-I-03-2` = **P**asillo 1 · lado **I**zquierdo (o **D**erecho) · módulo **03** · nivel **2** (1 = piso).
Cada pasillo tiene una fila de estanterías a cada lado; las filas interiores quedan espalda con espalda.

## Estructura del código

```
src/
  config/warehouseLayout.ts   ← medidas y cantidades (pasillos, módulos, niveles)
  domain/types.ts             ← tipos: Rack, StorageLocation, Selection…
  domain/generateWarehouse.ts ← arma el modelo (posiciones y códigos) desde la config
  data/mockInventory.ts       ← datos ficticios (a reemplazar por la fuente real)
  state/WarehouseContext.tsx  ← estado compartido: selección, hover, cámara
  scene/                      ← todo lo 3D
    WarehouseScene.tsx        ← Canvas, luces
    CameraRig.tsx             ← controles de órbita y animación de cámara
    Building.tsx              ← piso, paredes, demarcación y carteles de pasillo
    RackModel.tsx             ← estructura de una fila de estanterías
    StorageSlot.tsx           ← una ubicación: paletas + volumen seleccionable
    Label.tsx, colors.ts
  ui/                         ← interfaz HTML
    Toolbar.tsx, InfoPanel.tsx
```

### Cambios habituales

- **Más pasillos, módulos o niveles / otras medidas:** editar `src/config/warehouseLayout.ts`.
- **Colores del modelo:** `src/scene/colors.ts`. Colores de estados: `STATUS_META` en `src/data/mockInventory.ts`.
- **Datos reales a futuro:** reemplazar `getLocationInfo()` en `src/data/mockInventory.ts`
  manteniendo la misma interfaz; la escena y el panel no necesitan cambios.
