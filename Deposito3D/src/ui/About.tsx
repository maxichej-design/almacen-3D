/** Qué es Deposito3D y hacia dónde va (útil para presentarlo). */
export function About({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Cerrar">×</button>
        <h2 id="about-title">Deposito3D</h2>
        <p className="lead">Un gemelo digital del almacén: ver el stock en 3D, ubicación por ubicación, para controlar el inventario con más precisión.</p>

        <h3>Para qué sirve hoy</h3>
        <ul>
          <li><b>Encontrar</b> cualquier pieza o ubicación (C5.1) y llegar “caminando” en 3D.</li>
          <li><b>FIFO:</b> ver qué lote ingresó primero y en qué ubicación está.</li>
          <li><b>Conteo cíclico:</b> qué ubicaciones toca contar según clase A/B/C, cuáles están vencidas, y planilla para salir a contar.</li>
          <li><b>Obsoletos (D):</b> dónde ocupan lugar, para gestionar la baja.</li>
          <li><b>Tablero:</b> ocupación por fila, antigüedad del stock, estado de conteos.</li>
          <li><b>Actualización con un reporte</b> de stock (Excel/CSV) descargado del sistema.</li>
        </ul>

        <h3>Hoja de ruta</h3>
        <ol>
          <li><b>Etapa 1 – Prototipo (actual):</b> modelo 3D, búsqueda, FIFO, conteos, carga por reporte.</li>
          <li><b>Etapa 2 – Layout real:</b> plano de ingeniería, nomenclatura y medidas exactas.</li>
          <li><b>Etapa 3 – En línea:</b> servidor común y conexión con QAD (movimientos y descuentos en vivo).</li>
          <li><b>Etapa 4 – Planta completa:</b> WIP y preproducción en 3D, dashboards y reportes.</li>
        </ol>
        <p className="muted small">Los datos de esta versión son de demostración hasta cargar un reporte real.</p>
      </div>
    </div>
  );
}
