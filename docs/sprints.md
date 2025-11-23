# Registro de sprints

Esta tabla resume el estado de los sprints del WMS, los objetivos principales y su situación actual.

## Resumen por estado
- **Completados**: trabajo integrado a la rama principal y cubierto por pruebas básicas.
- **En progreso**: historias detalladas y parcialmente implementadas o en validación.
- **Pendientes**: alcance diseñado a alto nivel a la espera de priorización y estimación.

## Sprints completados
1. **Sprint 1 – Fundaciones de arquitectura** (Completado)
   - Inicialización del monorepo NestJS, configuración de TypeScript, ESLint/Prettier y scripts de ejecución.
   - Definición de capas de dominio/aplicación/infrastructura y convenciones de DTOs.
2. **Sprint 2 – Modelado de dominio inbound** (Completado)
   - Esquema Prisma para lotes, movimientos, stock y entidades de inbound con PostgreSQL y `DATABASE_URL` parametrizable.
   - Generación de cliente Prisma y migraciones iniciales para soportar persistencia transaccional.
3. **Sprint 3 – Exposición de catálogos y salud** (Completado)
   - Endpoints de salud y CRUD básicos para autenticación, productos, ubicaciones y almacenes.
   - Validaciones de unicidad y manejo de errores 404/409 en catálogos base.
4. **Sprint 4 – Flujos clave de inbound, inventario y outbound** (Completado)
   - Recepción de compras con estados y confirmación que generan movimientos de entrada.
   - Conteos cíclicos, ajustes y selección FEFO para reservas y picking.
   - Liberación de órdenes de salida y tareas de picking con trazabilidad de stock.
5. **Sprint 5 – Empaque y expedición outbound** (Completado e integrado en rama principal)
   - Empaquetado posterior al picking mediante unidades de manejo (handling units) asociadas a líneas de órdenes.
   - Planeación y carga de embarques con unidades asignadas por almacén y despacho que registra movimientos `OUTBOUND_SHIPMENT`.
   - Validaciones de alineación de bodega/orden y límites de cantidad empacada respecto a lo pickeado.
6. **Sprint 6 – Optimización operativa** (Completado)
   - Motor de slotting y sugerencias de reubicación con validaciones de capacidad y reglas por velocidad/zona.
   - Balanceo inter-warehouse para distribuir carga y evitar saturación de inventario.
   - KPIs de capacidad y productividad para monitorear eficiencia operativa.
7. **Sprint 7 – Seguridad y compliance** (Completado)
   - MFA y OAuth2 habilitados para usuarios internos y externos, con validaciones centralizadas de sesión y dispositivo.
   - Políticas de retención de datos aplicadas junto con cifrado en tránsito y en reposo para catálogos maestros y registros operativos.
   - Proceso recurrente de revisión de permisos con trazabilidad detallada de cambios en roles y accesos sensibles.

## Sprints en progreso
- Ninguno; el alcance comprometido está integrado en la rama principal.

## Sprints pendientes
 - Ninguno; el backlog relevante está priorizado y planificado.
