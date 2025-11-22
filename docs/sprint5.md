# Sprint 5 plan y trazabilidad

## Objetivos
- Completar el flujo posterior al picking con empaquetado en handling units y validaciones de cantidades pickeadas.
- Consolidar embarques por almacén, asegurando compatibilidad de unidades de manejo con las órdenes de salida asociadas.
- Registrar el despacho con trazabilidad de movimientos `OUTBOUND_SHIPMENT` y filtros operativos para consulta.

## Historias de usuario y criterios de aceptación
1. **Como responsable de packing, quiero crear handling units y llenarlas con las piezas pickeadas**
   - Puedo generar códigos o usar etiquetas externas y parametrizar tipo de unidad (caja, pallet, parcel).
   - Solo puedo empacar cantidades que no excedan lo previamente pickeado para cada línea de orden y en el mismo almacén.
2. **Como coordinador de transporte, quiero agrupar handling units en embarques**
   - Puedo crear embarques planificados por almacén y asociar múltiples unidades de manejo a partir de órdenes de salida compatibles.
   - El embarque avanza a estado `LOADING` tras asignar unidades y valida que no haya duplicados ni HUs de otro almacén.
3. **Como supervisor de salida, quiero despachar embarques con registro de movimientos**
   - Solo puedo despachar embarques en estado `PLANNED` o `LOADING` y que tengan unidades asignadas.
   - El despacho genera movimientos `OUTBOUND_SHIPMENT` por cada línea empacada y marca el embarque como `DISPATCHED` con hora efectiva.

## Endpoints / casos de uso y artefactos
- **Handling units (empaque)**
  - `POST /outbound/handling-units` crea una unidad de manejo con metadatos físicos opcionales; código generado si no se envía uno.
  - `POST /outbound/handling-units/:id/items` agrega líneas empacadas vinculadas a órdenes de salida y valida productos, cantidades pickeadas y coincidencia de almacén.
  - `GET /outbound/handling-units` y `GET /outbound/handling-units/:id` permiten filtrar por almacén/tipo o consultar detalle con líneas empacadas.
  - Código principal: `src/modules/outbound/outbound.controller.ts` y `src/modules/outbound/outbound.service.ts` (validaciones de cantidades, generación de código, empaquetado por línea).
- **Shipments (embarque y despacho)**
  - `POST /outbound/shipments` crea embarques con referencias de transporte y fecha programada opcional.
  - `POST /outbound/shipments/:id/handling-units` asigna HUs existentes, cambia estado a `LOADING` y evita duplicados o almacenes distintos.
  - `POST /outbound/shipments/:id/dispatch` registra salida física, genera movimientos `OUTBOUND_SHIPMENT` y marca estado `DISPATCHED` con hora real.
  - `GET /outbound/shipments` y `GET /outbound/shipments/:id` exponen filtros por almacén/estado/fechas y muestran unidades asociadas.
  - Código principal: `src/modules/outbound/outbound.controller.ts` y `src/modules/outbound/outbound.service.ts` (transacciones de asignación/despacho y creación de movimientos).

## Pruebas cubiertas
- `test/outbound/outbound.service.spec.ts` valida creación de handling units, reglas de empaquetado (no exceder pickeado), asignación a embarques, bloqueo de despacho sin unidades y generación de movimientos al despachar.
- Las pruebas reutilizan dobles Prisma para verificar cambios de estado (`PLANNED` → `LOADING` → `DISPATCHED`) y creación de movimientos durante el despacho.

## Integración en la rama principal
- Las historias y endpoints anteriores están disponibles en la rama principal tras la integración del flujo de empaquetado y embarques (HEAD `0310370`).
