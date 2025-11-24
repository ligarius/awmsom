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
8. **Sprint 8 – Observabilidad y continuidad operativa** (Completado)
   - Objetivos: reforzar monitoreo, alertamiento proactivo y planes de continuidad frente a caídas parciales de servicios clave.
   - Historias completadas: tableros de trazabilidad end-to-end, alertas basadas en SLO para APIs críticas y runbooks versionados para respuestas operativas.
   - Estado final: cobertura de métricas y logs en servicios de inventario y outbound con tests de caos básicos; dependencias para Sprint 9: catálogos de alertas consolidados y runbooks listos para automatización de remediación.

## Sprint 9 – Automatización de alertas y remediación (En progreso)
- **Objetivos**: orquestar la automatización de respuestas ante incidentes críticos consumiendo los catálogos de alertas y runbooks consolidados en Sprint 8, extender la cobertura de monitoreo a flujos mixtos inbound/outbound y documentar evidencias de continuidad.
- **Historias en progreso**:
  1. Integrar el catálogo de alertas y umbrales de SLO definidos en [`configuration/alerts.yml`](../configuration/alerts.yml) con tableros y vistas operativas actualizadas en [`docs/dashboards/observabilidad.md`](dashboards/observabilidad.md).
  2. Automatizar los pasos de mitigación en el runbook de resiliencia para inventario y outbound, extendiendo la guía de [`docs/runbooks/inventory-outbound-resilience.md`](runbooks/inventory-outbound-resilience.md) con ganchos para ejecuciones programáticas.
  3. Validar escenarios de degradación y recuperación mediante pruebas de resiliencia y alertas en [`test/monitoring/resilience-alerts.spec.ts`](../test/monitoring/resilience-alerts.spec.ts) y auditoría de salud en [`test/monitoring/audit-monitoring.spec.ts`](../test/monitoring/audit-monitoring.spec.ts).
- **Estado actual**: las dependencias heredadas del Sprint 8 (catálogos de alertas consolidados y runbooks versionados) están alineadas con los despliegues de observabilidad; se encuentran en validación las automatizaciones de remediación y las pruebas de resiliencia.
- **Criterios de aceptación**:
  - El catálogo de alertas presenta umbrales revisados y versionados, con trazabilidad en dashboards y endpoints (`/monitoring/alerts` y `/monitoring/slo`).
  - Los runbooks incluyen pasos accionables para ejecutores humanos y para pipelines automatizados, con enlaces a comandos y scripts documentados.
  - Las pruebas de resiliencia y alertamiento pasan en entornos de staging con evidencia de ejecución y cobertura sobre los flujos de inventario/outbound.
- **Artefactos clave**:
  - Catálogo de alertas y SLOs: [`configuration/alerts.yml`](../configuration/alerts.yml).
  - Runbook de resiliencia y remediación: [`docs/runbooks/inventory-outbound-resilience.md`](runbooks/inventory-outbound-resilience.md).
  - Tableros y vistas de observabilidad: [`docs/dashboards/observabilidad.md`](dashboards/observabilidad.md).
  - Pruebas automatizadas de monitoreo y resiliencia: [`test/monitoring/resilience-alerts.spec.ts`](../test/monitoring/resilience-alerts.spec.ts) y [`test/monitoring/audit-monitoring.spec.ts`](../test/monitoring/audit-monitoring.spec.ts).

## Sprints en progreso
- Sprint 9 activo con automatización de alertas y remediación en validación (ver detalle en la sección anterior).

## Sprints pendientes
 - Ninguno; el backlog relevante está priorizado y planificado.
