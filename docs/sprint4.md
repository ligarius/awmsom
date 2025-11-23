# Sprint 4 plan y trazabilidad

## Objetivos
- Consolidar flujos críticos de inbound, inventario y outbound garantizando validaciones de negocio y trazabilidad de movimientos.
- Publicar endpoints HTTP listos para pruebas integradas de recibos, órdenes de salida y ajustes de inventario.
- Alinear historias de usuario con artefactos de código y suites de pruebas automatizadas.

## Historias de usuario y criterios de aceptación
1. **Como planner, quiero registrar recibos de compra y confirmarlos**
   - Puedo crear un recibo en estado `DRAFT` y agregar líneas con lotes/fechas de expiración cuando el producto lo exige.
   - Solo se pueden confirmar recibos en borrador o parcialmente recibidos y con al menos una línea.
   - La confirmación genera movimientos de tipo inbound y aumenta el stock disponible en la ubicación destino.
2. **Como responsable de inventario, quiero ejecutar conteos cíclicos y ajustes**
   - Puedo crear tareas de conteo, añadir líneas, iniciarlas y enviar resultados que ajusten existencias.
   - Se registran ajustes manuales con motivo, impacto en stock y trazabilidad por ubicación/lote.
3. **Como coordinador de salida, quiero liberar órdenes y generar tareas de picking**
   - Una orden liberada asigna o reserva inventario siguiendo FEFO cuando aplica.
   - Las tareas de picking permiten iniciar, confirmar cantidades y registrar movimientos de salida.
4. **Como administrador, quiero que módulos base expongan salud y CRUD de catálogos**
   - Endpoints de salud activos para auth, products, locations, inventory.
   - CRUD de almacenes con validación de códigos únicos y desactivación lógica.

## Endpoints / casos de uso y artefactos
- **Auth**
  - `GET /auth/health` → chequeo de disponibilidad. Código: `src/modules/auth/auth.controller.ts`.
  - Gestión de usuarios por tenant: `GET /auth/tenants/:tenantId/users` (404 si el tenant no existe, 401 si está inactivo).
  - Control de estado: `PATCH /auth/users/:id/deactivate` retorna 409 si el usuario ya está inactivo, 404 si no existe y 401 si el tenant está inactivo.
  - Eliminación: `DELETE /auth/users/:id` requiere tenant activo y usuario activo; responde 404 si el usuario no existe y 409 si está inactivo.
- **Warehouses (catálogo)**
  - `POST /warehouses`, `GET /warehouses`, `GET /warehouses/:id`, `PUT /warehouses/:id`, `DELETE /warehouses/:id`.
  - Reglas: códigos únicos, manejo de errores 404/409. Código: `src/modules/warehouses/warehouses.controller.ts` y capa de aplicación/mappers asociada.
- **Inbound**
  - `POST /inbound/receipts` crea recibos en estado `DRAFT`; `POST /inbound/receipts/:id/lines` agrega líneas con validaciones de lote/expiración.
  - `POST /inbound/receipts/:id/confirm` confirma líneas, crea movimientos `INBOUND_RECEIPT` y aumenta stock `AVAILABLE` en la ubicación destino. Listado y consulta con `GET /inbound/receipts` y `GET /inbound/receipts/:id`.
  - Código principal: `src/modules/inbound/inbound.controller.ts` y `src/modules/inbound/inbound.service.ts` (validaciones, transacciones, creación de batches y movimientos).
  - Pruebas: `test/inbound/inbound.service.spec.ts` (creación, agregado de líneas, confirmación y errores).
- **Inventory**
  - Salud: `GET /inventory/health`.
  - Ciclos de conteo: `POST /inventory/cycle-counts`, `POST /inventory/cycle-counts/:id/lines`, `POST /inventory/cycle-counts/:id/start`, `POST /inventory/cycle-counts/:id/submit`, consultas con `GET /inventory/cycle-counts` y `GET /inventory/cycle-counts/:id`.
  - Ajustes: `POST /inventory/adjustments`, consulta con `GET /inventory/adjustments` y `GET /inventory/adjustments/:id`.
  - Código: `src/modules/inventory/inventory.controller.ts` y `src/modules/inventory/inventory.service.ts` más DTOs y aplicación.
  - Pruebas: `test/inventory/*` cubre ajustes, selección FEFO, bloqueo de lotes y movimientos.
- **Outbound**
  - Órdenes: `POST /outbound/orders`, `GET /outbound/orders`, `GET /outbound/orders/:id`, `POST /outbound/orders/:id/release` (reserva stock), `POST /outbound/orders/:id/create-picking-task`.
  - Picking: `POST /outbound/picking-tasks/:id/start`, `POST /outbound/picking-tasks/:id/confirm`, listados y consulta (`GET /outbound/picking-tasks`, `GET /outbound/picking-tasks/:id`).
  - Código: `src/modules/outbound/outbound.controller.ts` y `src/modules/outbound/outbound.service.ts` (asignación FEFO, reservas, creación de tareas, movimientos de salida).
  - Pruebas: `test/outbound/outbound.service.spec.ts` valida liberación, asignación y confirmación de picking.
- **Catálogos de apoyo**
  - `GET /products/health` y `GET /locations/health` para disponibilidad básica. Código en `src/modules/products/products.controller.ts` y `src/modules/locations/locations.controller.ts`.

## Cobertura cruzada
- Movimientos y stock usan Prisma y enums de estado (`StockStatus`, `MovementType`, `OutboundOrderStatus`, etc.) integrados en servicios de inbound/outbound/inventory.
- Las pruebas unitarias enfocan reglas de negocio clave (validaciones de cantidades, FEFO, lotes obligatorios) para cada módulo.
