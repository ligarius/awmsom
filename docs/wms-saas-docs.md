# Documentación Integral WMS SaaS (Sprints 1–10)

## Documento 1 – Visión General del WMS SaaS
- **Qué es**: Plataforma WMS multi-tenant de nivel enterprise, orientada a operaciones de almacén de alta complejidad con trazabilidad end-to-end y APIs abiertas. Combina control operativo (recepción, inventario, picking, despacho) con motores avanzados (slotting, replenishment, wave picking) y observabilidad integrada.
- **Objetivos**:
  - Maximizar exactitud de inventario y cumplimiento OTIF.
  - Reducir tiempos de ciclo inbound/outbound mediante automatización y orquestación de tareas.
  - Asegurar trazabilidad total por lote, SKU, cliente y HU.
  - Facilitar extensibilidad vía API pública, webhooks e integraciones ERP/TMS/ecommerce.
- **Funcionalidades core**: catálogos maestros (warehouses, locations, products), gestión de inventario y lotes, recepciones, órdenes outbound, tareas de picking, packing, shipments y movimientos auditables.
- **Capacidades avanzadas**: slotting con reglas de compatibilidad, replenishment automático, wave picking por estrategia, KPIs y snapshots, monitoreo con alertas y runbooks, MFA/OAuth y revisión de accesos.
- **Enfoque multi-tenant**: separación lógica por `tenantId` en todas las entidades, límites por plan, aislamiento de datos, API keys por tenant y auditoría por usuario/tenant.
- **Diferenciadores**:
  - Motor de trazabilidad unificada y búsquedas cruzadas inbound/outbound/movimientos.
  - Gobernanza de seguridad (RBAC granular, MFA, revisiones de acceso) y observabilidad operativa lista para auditorías.
  - Diseño preparado para escalabilidad horizontal (colas BullMQ, cache Redis, snapshots) y despliegue cloud-native.

## Documento 2 – Arquitectura General
### Diagrama (texto descriptivo)
Cliente web / móvil → API Gateway (TLS) → NestJS (REST) → Prisma → PostgreSQL; Redis para cache y colas BullMQ; Workers para tareas batch y cron diarios; Webhooks/Integraciones → ERP/TMS/OMS externos. Observabilidad (logs, métricas, trazas) y almacenamiento de snapshots.

### Backend
- **NestJS**: módulos por dominio (auth, warehouses, products, inventory, inbound, outbound, picking, slotting, replenishment, waves, monitoring, integration, audit).
- **Prisma + PostgreSQL**: persistencia relacional con enums de negocio (estados de órdenes, picking, batches, waves, permisos) y PKs UUID.

### Redis
- **Cache**: catálogos y resultados de consultas frecuentes (inventario por SKU/lote/ubicación, políticas activas).
- **Colas BullMQ**: workers para generación de ondas, sugerencias de replenishment/slotting, consolidación de KPIs, entrega de webhooks y reprocesos de integración.

### BullMQ y workers
- Workers desacoplados del API para: generación de picking tasks, ejecución de políticas de replenishment, recomputo de rutas de wave picking, disparo de alertas SLO y reintentos de integraciones.

### Snapshots y cronjobs
- Cron diario: consolidación de **inventory snapshots** y **kpi snapshots** por tenant/warehouse; exportación de auditoría con retención y expiración programable.

### API pública
- REST versionada (v1) con JWT y API Keys; soporta filtros (tenantId implícito), paginación y idempotency keys para operaciones críticas.

### Multi-tenant
- Campo `tenantId` obligatorio en todos los modelos y relaciones; índices por tenant para aislamiento lógico y performance. Límites y planes mediante `SubscriptionPlan` y `UsageMetric`.

### Seguridad
- **RBAC**: Roles + permisos (`PermissionResource`, `PermissionAction`) aplicados en guards NestJS.
- **Autenticación**: JWT para sesiones web/móvil, API Keys por tenant para integraciones server-to-server.
- **MFA/OAuth**: factores adicionales y federación; revisiones periódicas de acceso (AccessReview).

### Auditoría
- **AuditLog** para cada operación sensible (quién, qué, cuándo, metadata). Integración con trazabilidad por lote/HU y retención configurable.

### Deployment recomendado
- Contenedores (API + workers) en orquestador (Kubernetes/ECS); PostgreSQL administrado; Redis administrado (cache + colas); API Gateway con WAF; almacenamiento cifrado; pipelines CI/CD con migraciones Prisma y smoke tests; dashboards y alertas SLO.

## Documento 3 – Modelo de Datos Completo
Resumen de entidades clave (campos base incluyen `id`, `tenantId`, `createdAt`, `updatedAt`, metadatos y FK según aplique). Ver esquemas en `prisma/schema.prisma` para detalle de índices y enums.

### Tenancy y seguridad
- **Tenant / SubscriptionPlan / UsageMetric / BillingEvent**: aislamiento, planes y consumo. Índices por tenant y periodos para control de límites.
- **User, Role, UserRole, RolePermission**: RBAC con acciones y recursos; `AccessReview` registra revisiones de permisos. **ApiKey** por tenant.
- **AuditLog**: rastro de operaciones con IP/user-agent y expiración opcional.

### Catálogos operativos
- **Warehouse** con `code`, `name`, `isActive`; **Location** con jerarquía (zone, aisle, row, level) y compatibilidad (`LocationCompatibilityRule`). **ZoneType** enum.
- **Product** (`sku`, `requiresBatch`, `defaultUom`, flags de caducidad). **Batch** (`batchCode`, `expiryDate`, `status`).

### Inventario y control
- **Inventory**: cantidad por SKU+lote+ubicación+estado (`StockStatus`). Índices para búsquedas por producto/batch/ubicación.【F:prisma/schema.prisma†L619-L644】
- **InventoryAdjustment** con `AdjustmentType` y trazabilidad a usuario/ubicación.
- **CycleCountTask / CycleCountLine**: conteos cíclicos con `CycleCountStatus`.

### Inbound
- **InboundReceipt / InboundReceiptLine** con `InboundReceiptStatus` y vínculo a warehouse/product/batch; genera movimientos `MovementHeader/MouvmentLine` tipo `INBOUND_RECEIPT`.

### Outbound y picking
- **OutboundOrder / OutboundOrderLine** con estados `OutboundOrderStatus`, cantidades solicitadas/allocadas/pickeadas.【F:prisma/schema.prisma†L820-L898】
- **PickingTask / PickingTaskLine**: tareas por orden u ola, con `PickingTaskStatus`, relación a línea outbound, producto, lote y ubicación origen.【F:prisma/schema.prisma†L900-L949】
- **HandlingUnit / HandlingUnitLine / Shipment / ShipmentHandlingUnit** para packing y despacho, con `ShipmentStatus` y HU por orden.【F:prisma/schema.prisma†L1028-L1097】

### Waves (Sprint 10)
- **Wave**: estrategia (`WavePickingStrategy`), totales y picker asignado; estados `WaveStatus`.
- **WaveOrder**: enlace ola-orden.
- **WavePickingPath**: ruta optimizada en JSON con distancia/tiempo estimado.【F:prisma/schema.prisma†L951-L1026】

### Movimientos
- **MovementHeader / MovementLine**: tipo (`MovementType`), origen/destino, cantidades y estado `MovementStatus` para trazabilidad completa.

### Replenishment (Sprint 8)
- **ReplenishmentPolicy**: método (`FIXED`, `MIN_MAX`, `EOQ`, `DOS`), umbrales y periodicidad por producto/warehouse.【F:prisma/schema.prisma†L1351-L1382】
- **ReplenishmentSuggestion** con `ReplenishmentStatus` (pendiente/aprobado/ejecutado) y motivo.【F:prisma/schema.prisma†L1384-L1404】
- **TransferOrder / TransferOrderLine** para traslados inter-warehouse con estado `TransferOrderStatus`.【F:prisma/schema.prisma†L1406-L1436】

### Slotting (Sprint 9)
- **SlottingConfig**: ventanas ABC/XYZ y reglas de zonas especiales; compatibilidad por ubicación/producto via `LocationCompatibilityRule`.【F:prisma/schema.prisma†L1469-L1489】
- **SlottingRecommendation**: ubicación recomendada, score y estado (`SlottingStatus`).【F:prisma/schema.prisma†L1510-L1532】

### KPIs y snapshots
- **InventorySnapshot** y **KpiSnapshot**: captura diaria por warehouse/producto, usada para dashboards y SLOs.

### Integración y configuración
- **IntegrationConfig / IntegrationJob**: tipo (`ERP`, `TMS`, `ECOMMERCE`) y estado de ejecución con reintentos.
- **WebhookSubscription**: destinos por evento.
- **TenantConfig / PickingMethodConfig / WarehouseZoneConfig / InventoryPolicy / OutboundRule**: parámetros operativos y defaults (UOM, FEFO/FIFO, tiempos de reposición, reglas de liberación).

## Documento 4 – Manual de Usabilidad Operativa
Guía paso a paso centrada en el operario. Los ejemplos asumen interfaz móvil/handheld con escáner y validaciones en línea.

### A. Recepción (Inbound)
1) **Crear recepción**: ingresar proveedor/PO o transferencia, warehouse y fechas; el sistema valida duplicados y abre estado *Draft*.
2) **Registrar lote**: escanear SKU y lote; si el producto exige lote/caducidad, la app solicita `batchCode` y `expiryDate` y bloquea si faltan datos.
3) **Sugerir ubicación**: el motor propone ubicación destino según zona de recepción/quarantine, capacidad y compatibilidad; se muestra en pantalla con alternativa manual.
4) **Confirmar**: escanear ubicación sugerida y cantidad recibida; si hay discrepancia, registrar motivo. Estado pasa a *Partially Received* o *Received* y genera movimiento inbound.
5) **Alertas**: lote bloqueado/recall, ubicación incompatible, exceso de capacidad, fecha de caducidad vencida próxima, duplicado de ASN/PO.
6) **Errores comunes**: SKU no existe o inactivo, ubicación no pertenece al warehouse, cantidad negativa, lote requerido faltante, usuario sin permiso *INBOUND.CREATE*.

### B. Inventario
- **Consultar stock**: buscar por SKU, lote, ubicación o estado; se muestra cantidad disponible/reservada y HUs asociadas.
- **Ver lote/ubicación**: detalle con historial de movimientos y auditoría por usuario/fecha.
- **Ajuste**: seleccionar ubicación y SKU, ingresar motivo (gain/loss/correction), capturar evidencia opcional. Requiere doble confirmación y registro en AuditLog.
- **Conteo cíclico**: recibir tarea con ubicación/lote; escanear ubicación, contar unidades, ingresar diferencia. Estados: *Pending → In Progress → Completed*; discrepancias generan ajuste automático con justificación.

### C. Outbound
- **Ver pedidos**: listado filtrable por estado (Draft, Released, Allocated, Picking, Picked, Cancelled) y prioridad.
- **Liberar pedidos**: validar inventario disponible, aplicar FEFO para lotes, crear reservas y tareas de picking. Errores: stock insuficiente, lote bloqueado, compatibilidad de ubicación.
- **Estados**: `DRAFT` (captura), `RELEASED` (validado), `PARTIALLY/FULLY_ALLOCATED`, `PICKING`, `PARTIALLY_PICKED`, `PICKED`, `CANCELLED`.

### D. Picking
- **Ver tareas**: tablero por picker con prioridad y tipo (order, wave, batch, zone). Se puede aceptar/rechazar si no está asignada.
- **Escanear ubicación**: el flujo exige escanear ubicación origen; si mismatch, alerta sonora y bloqueo.
- **Confirmar cantidad**: ingresar unidades pickeadas; el sistema compara con `quantityToPick` y permite ajustes por falta de stock con motivo.
- **Diferencias**: si pick < solicitado, se marca backorder o genera tarea de reubicación; si pick > solicitado, bloqueo con alerta.

### E. Wave Picking (Sprint 10)
- **Agrupar pedidos**: seleccionar estrategia (por ruta, carrier, zona, ventana de tiempo, prioridad) y lanzar ola; se calculan totales y rutas.
- **Asignar a picker**: escoger usuario disponible; la app muestra ruta optimizada con secuencia de ubicaciones.
- **Monitorear progreso**: tablero con porcentaje completado, unidades pendientes y alertas de bloqueo/stock.
- **Rutas óptimas**: navegación paso a paso; si se salta una ubicación, se notifica y recalcula. Finalizar ola marca tareas como completadas y libera packing.

### F. Replenishment (Sprint 8)
- **Generar sugerencias**: cron/worker evalúa políticas por producto/warehouse (FIXED, MIN/MAX, EOQ, DOS) y stock en picking vs reserve.
- **Aprobar/Rechazar**: supervisor revisa cantidad sugerida y razón (p.ej., `safetyStock` o `dos breach`); al aprobar se crea Transfer Order o tarea de movimiento interno.
- **Ejecutar transferencia**: escanear ubicación origen/destino, confirmar cantidad; estado pasa a *Executed* y se actualiza inventario.

### G. Slotting (Sprint 9)
- **Ver recomendaciones**: lista con score y ubicación recomendada; filtros por producto/clase/ABC/XYZ.
- **Justificar re-slotting**: registrar motivo (alta rotación, incompatibilidad, planograma). Requiere aprobación si implica zona restringida.
- **Ejecutar**: generar movimiento de reubicación; al completar, estado cambia a *Executed* y se recalcula score.

### H. Trazabilidad (Sprint 6 & 10)
- **Búsqueda por lote**: ingresar `batchCode`; se muestran recepciones, movimientos, órdenes, HUs y embarques relacionados con timestamps.
- **Búsqueda por cliente/fecha**: filtrar órdenes por `customerId` y rango temporal; ver cadena de eventos (picking, packing, shipment) con auditoría.

### I. Dashboards y KPIs
- **Métricas**: exactitud de inventario, OTIF, fill rate, productividad picking, capacidad por zona, aging de lotes, cumplimiento de SLOs.
- **Alarmas**: disparos por quiebres de stock, exceso de backlog de picking, olas retrasadas, recepciones vencidas, lotes próximos a expirar.

## Documento 5 – Manual de Administrador del Sistema
- **Configuración global del tenant**: definir plan y límites, zona horaria, UOM por defecto, políticas FEFO/FIFO, reglas de retención y expiración de auditoría.
- **Bodegas, zonas y ubicaciones**: crear warehouse con `code`; definir zonas (receiving, picking, reserve, quarantine, shipping) y ubicaciones jerárquicas. Cargar compatibilidades por producto/clase y capacidades.
- **Políticas**: inventory policies (capacidad, stock states permitidos), outbound rules (release/priority), picking methods, replenishment policies y slotting configs.
- **Integraciones**: configurar endpoints ERP/TMS/ecommerce, autenticación (API key, OAuth), mapeo de catálogos y webhooks por evento (orden creada, picking completado, shipment dispatch).
- **Usuarios y permisos**: crear roles por función (operario, supervisor, admin, auditor). Aplicar MFA obligatorio para admins; revisar accesos periódicamente con AccessReview.
- **Planes y límites**: controlar warehouses máximos, usuarios, órdenes/mes e integraciones según `SubscriptionPlan`; monitorear con UsageMetrics y alertas preventivas.
- **Compatibilidad y restricciones**: definir reglas ALLOW/BLOCK por ubicación para productos especiales (peligrosos, frágiles, frío). Validaciones en inbound y picking.

## Documento 6 – Flujos Técnicos de Procesos
- **Recepción → Inventario → Movimientos**: ASN/PO crea InboundReceipt (Draft). Al recibir, se generan MovementHeader/Line tipo INBOUND_RECEIPT y registros Inventory en ubicación destino. AuditLog guarda usuario y timestamps.
- **Outbound → Wave → Picking → Packing → Shipment**: Orden RELEASED reserva stock FEFO. Si estrategia wave, se agrupan órdenes y se generan PickingTasks por ruta; el pick actualiza Inventory a `PICKING`/`RESERVED`, luego HU registra cantidades y Shipment marca salida con MovementLine OUTBOUND_SHIPMENT.
- **Replenishment automático**: cron lee ReplenishmentPolicy; si `minQty` o `dos` incumplidos, crea ReplenishmentSuggestion y, al aprobar, TransferOrder o tarea interna. Movimientos quedan en estado COMPLETED cuando el inventario destino se actualiza.
- **Slotting → Re-slotting**: worker calcula ABC/XYZ y genera SlottingRecommendation; al aprobar, se crea movimiento de reubicación y se actualiza compatibilidad/capacidad.
- **Generación de KPIs y snapshots**: job diario consulta Inventory y operaciones para crear InventorySnapshot y KpiSnapshot por tenant/warehouse; resultados se cachean y exponen en dashboards.
- **Procesos automáticos con colas**: BullMQ ejecuta en segundo plano las ondas, reintentos de integración, entrega de webhooks, recomputo de rutas y purga de auditoría expirada para no bloquear el API.

## Documento 7 – API Reference (Backend)
Estilo Swagger textual (todas requieren `Authorization: Bearer <jwt>` o `x-api-key` para integraciones S2S; `X-Tenant-Id` implícito por token o header según gateway).

- **Auth**: `POST /auth/login` (email, password) → JWT; `POST /auth/mfa/verify`; `POST /auth/oauth/callback`.
- **Warehouses**: `GET /warehouses` (filtros: code, isActive); `POST /warehouses`; `PATCH /warehouses/:id`; permisos: `WAREHOUSE.READ/CREATE/UPDATE`.
- **Locations**: `GET /locations` (warehouseId, zone, code); `POST /locations`; `POST /locations/compatibility` para reglas ALLOW/BLOCK.
- **Products & Batches**: `GET /products`, `POST /products`; `GET /batches?productId&batchCode`; validan `requiresBatch/expiry`.
- **Inventory**: `GET /inventory?sku&batch&locationId&stockStatus`; `POST /inventory/adjustments`; `POST /inventory/cycle-counts` (crear tarea) y `POST /inventory/cycle-counts/:id/complete`.
- **Inbound**: `POST /inbound/receipts` (lines con SKU, qty, lote opcional); `POST /inbound/receipts/:id/confirm`; estados `DRAFT/PARTIALLY_RECEIVED/RECEIVED`.
- **Outbound**: `POST /outbound/orders`; `POST /outbound/orders/:id/release`; `GET /outbound/orders?status`; `POST /outbound/orders/:id/cancel`.
- **Picking**: `GET /picking/tasks?status&pickerId&waveId`; `POST /picking/tasks/:id/accept`; `POST /picking/tasks/:id/complete` (line items con qty pickeada); `POST /waves` para crear ola con estrategia.
- **Handling Units & Shipments**: `POST /handling-units` (tipo, medidas); `POST /handling-units/:id/lines`; `POST /shipments` (warehouseId, carrier, route); `POST /shipments/:id/dispatch`.
- **Replenishment**: `POST /replenishment/policies`; `GET /replenishment/suggestions`; `POST /replenishment/suggestions/:id/approve`; `POST /transfer-orders`.
- **Slotting**: `POST /slotting/config`; `GET /slotting/recommendations`; `POST /slotting/recommendations/:id/approve`.
- **Monitoring/Traceability**: `GET /traceability?batchCode|productId|customerId`; `GET /audit-logs?resource&userId&dateRange`.

Errores comunes: 400 (validación), 401 (token inválido), 403 (falta permiso), 404 (id inexistente), 409 (conflicto de stock/lote), 422 (regla de compatibilidad), 429 (límite de plan).

## Documento 8 – Lineamientos de Frontend
- **Componentes clave**: layout responsivo, header con selector de warehouse y tenant, barra de búsqueda global (SKU/lote/orden), cards de KPIs, timeline de trazabilidad, grids con filtros persistentes y exportación CSV.
- **Vista operativa**: panel de tareas (recepción/picking/replenishment), flujo guiado con escaneo obligado, feedback inmediato (colores: verde ok, ámbar warning, rojo error), accesos rápidos a incidentes.
- **Vista administrativa**: configuración de catálogos, políticas, integraciones y usuarios con wizards y validaciones previas. Tablas con chips de estado y límites de plan visibles.
- **Flujos UX**: pasos cortos, confirmaciones dobles en acciones destructivas, offline-friendly en dispositivos móviles (cache local + reintentos), soporte de dark mode en almacén con baja iluminación.
- **Navegación**: menú lateral por módulo, breadcrumbs, búsqueda global con atajos, páginas de detalle con pestañas (Resumen, Movimientos, Auditoría, Integraciones).
- **UI rules**: indicadores de estado en badges, alerts persistentes para bloqueos de lote/ubicación, timers para tareas SLA, skeleton loaders y mensajes accionables.
- **Validaciones**: escaneo obligatorio en ubicaciones/HUs, límites máximos por UOM, confirmación de cantidades y motivos en diferencias, resguardo de datos antes de abandono de página.

## Documento 9 – Release Notes / Versionado
Resumen por sprint (1–10) con hitos principales; ver `docs/sprints.md` para detalle.
- **Sprint 1**: fundaciones NestJS/TS/Prisma, arquitectura limpia.
- **Sprint 2**: dominio inbound y stock; migraciones base.
- **Sprint 3**: catálogos y health endpoints; autenticación básica.
- **Sprint 4**: flujos inbound, inventario, outbound con FEFO y tareas de picking.
- **Sprint 5**: packing vía handling units, shipments y movimientos OUTBOUND_SHIPMENT.
- **Sprint 6**: motor de slotting, balanceo inter-warehouse, KPIs de capacidad/productividad.
- **Sprint 7**: seguridad avanzada (MFA/OAuth, retención, revisión de permisos, cifrado en tránsito/reposo).
- **Sprint 8**: observabilidad y continuidad; dashboards de trazabilidad y runbooks de resiliencia.
- **Sprint 9**: automatización de alertas y remediación, catálogos de alertas y runbooks ejecutables.
- **Sprint 10**: trazabilidad unificada por lote/cliente, consultas históricas y dashboards operativos.

## Documento 10 – Glosario Operacional + Técnico
- **LPN/HU (Handling Unit)**: unidad de manejo empaquetada (caja/pallet) identificada con código único.
- **Batch/Lot**: identificación de producción con `batchCode`, puede tener caducidad y estado (NORMAL/BLOCKED/RECALL).
- **Wave**: agrupación de órdenes para picking optimizado según estrategia y ruta.
- **Slotting**: asignación óptima de ubicaciones según rotación y compatibilidad; **Re-slotting** es la reubicación propuesta.
- **Picking Task**: instrucción operativa para extraer cantidad específica de una ubicación para una orden/ola.
- **Movement Header/Line**: registro auditable de movimientos físicos (inbound, transfer, ajuste, outbound).
- **Replenishment**: reabastecimiento de ubicaciones de picking desde reserva usando políticas FIXED/MINMAX/EOQ/DOS.
- **Transfer Order**: documento para mover inventario entre bodegas o zonas; puede originarse de replenishment o planeación.
- **Inventory Snapshot**: captura periódica de stock por SKU/lote/ubicación usada para KPIs y auditoría.
- **ABC/XYZ**: clasificadores de rotación (ABC por valor/volumen, XYZ por variabilidad de demanda).
- **DOS (Days of Supply)**: días de cobertura; usado para disparar replenishment.
- **OTIF**: On Time In Full; mide cumplimiento de entregas completas y puntuales.
- **Fill Rate**: porcentaje de unidades/pedidos surtidos respecto a lo solicitado.
- **Cycle Count**: conteo parcial recurrente para validar exactitud sin cerrar operación.
- **Quarantine**: zona/estado para stock en investigación o calidad.
- **Compatibility Rule**: restricción ALLOW/BLOCK para producto/clase en una ubicación.
- **API Key**: credencial para integraciones server-to-server; ligada a tenant y con límites.
- **RBAC**: control de acceso basado en roles y permisos específicos por recurso/acción.
- **Wave Picking Path**: ruta ordenada de ubicaciones para completar una ola minimizando distancia/tiempo.
