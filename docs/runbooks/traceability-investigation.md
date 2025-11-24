# Runbook: Investigación de trazabilidad end-to-end

## Propósito
Documentar los pasos para reconstruir el recorrido de un lote, producto o cliente a través de inbound, movimientos internos y outbound usando el servicio de trazabilidad.

## Alcance
- Consultas por lote específico (batch code) y su relación con recibos, movimientos y embarques.
- Reconstrucción de embarques por cliente dentro de una ventana de fechas.
- Historial consolidado por producto con separación de flujos (inbound, outbound, movimientos e inventario actual).

## Procedimiento
1. **Validar datos base**
   - Confirmar que el lote o producto existe en Prisma (`batch` o `product`).
   - Verificar el `tenantId` que se usará en la consulta.
2. **Trazabilidad por lote**
   - Ejecutar `TraceabilityService.getBatchTrace(tenantId, { batchCode })` o la API equivalente.
   - Revisar:
     - Recibos inbound y líneas asociadas (`inboundReceiptLine`).
     - Movimientos internos con origen/destino y cantidades.
     - Órdenes de salida y handling units asociadas a embarques.
3. **Trazabilidad por cliente**
   - Ejecutar `TraceabilityService.getCustomerShipmentsTrace(tenantId, { customerId, fromDate, toDate })`.
   - Validar agrupación de embarques, órdenes y lotes pickeados dentro del rango solicitado.
4. **Historial por producto**
   - Ejecutar `TraceabilityService.getProductHistory(tenantId, { productId, fromDate, toDate, batchCode? })`.
   - Confirmar que inbound, outbound, movimientos e inventario actual retornan separados y con batch codes cuando corresponda.
5. **Criterios de cierre**
   - Confirmar que los resultados contienen referencias cruzadas (ordenes, embarques, handling units) y cantidades consistentes.
   - Registrar hallazgos y, si aplica, generar evidencia con capturas de la API o exportes de datos.

## Referencias
- Cobertura automatizada en `test/traceability/traceability.service.spec.ts`.
- Definiciones de dominio y entidades en `src/modules/traceability`.
