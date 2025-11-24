# Dashboard de trazabilidad operativa

## Objetivo
Proveer visibilidad end-to-end de lotes, productos y clientes, combinando eventos de inbound, movimientos internos y outbound.

## Secciones
- **Mapa de lotes:** tabla con lotes activos, cantidades y ubicación actual (`inventory`) con filtros por `tenantId` y `batchCode`.
- **Recorridos recientes:** vista temporal que enlaza recibos inbound, movimientos y embarques para los últimos 7 días.
- **Clientes y embarques:** agrupación de embarques por cliente, mostrando órdenes, líneas y lotes pickeados.
- **Alertas de trazabilidad:** panel de eventos faltantes o inconsistentes (lote sin recibo, órdenes sin handling unit, etc.).

## Fuentes de datos
- API de trazabilidad (`TraceabilityService`) y endpoints expuestos para `batchTrace`, `customerShipmentsTrace` y `productHistory`.
- Inventario vigente desde el módulo de `inventory`.
- Historial de movimientos desde `movementLine` y `movementHeader`.

## Operación
1. Revisar el panel de lotes para validar inventario y ubicaciones.
2. Seguir el recorrido reciente para validar que cada movimiento tenga su evento anterior/posterior.
3. Usar la vista de clientes para auditar embarques dentro de ventanas específicas.
4. Confirmar que las alertas de trazabilidad se mantengan en cero después de cierres de turno o despliegues.
