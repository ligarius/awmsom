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

## Sprints en progreso
- **Sprint 5 – Integraciones y monitoreo**
  - Conectores para sistemas externos de compras/ventas, colas de eventos y métricas de observabilidad.
  - Endpoints de auditoría y tablero de salud unificado.

## Sprints pendientes
- **Sprint 6 – Optimización operativa**
  - Reglas avanzadas de slotting, sugerencias de reubicación y balanceo de carga entre almacenes.
  - Reportes de productividad y análisis de capacidad.
- **Sprint 7 – Seguridad y compliance**
  - MFA/OAuth2 para usuarios internos y externos, políticas de retención de datos y cifrado en tránsito/en reposo.
  - Revisiones periódicas de permisos y trazabilidad completa de cambios maestros.
