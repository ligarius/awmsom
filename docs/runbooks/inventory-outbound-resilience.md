# Runbook: Recuperación y resiliencia para APIs de inventario y outbound

## Objetivo
Garantizar continuidad operativa ante caídas parciales o degradaciones de las APIs críticas (inventario y outbound), siguiendo flujos end-to-end y respuestas consistentes.

## Alcance
- Servicios cubiertos: `/inventory` y `/outbound`.
- Señales observadas: métricas Prometheus, SLOs/alertas definidas en `configuration/alerts.yml`, trazas registradas vía `MonitoringService` y eventos de auditoría.

## Flujo end-to-end de detección a recuperación
1. **Detección:**
   - Alertas SLO activas en `monitoring/alerts` (latencia p95 y error rate).
   - Panel de dashboards (ver `../dashboards/observabilidad.md`) muestra spikes de latencia/errores.
   - Logs y trazas recientes en `monitoring/signals` indican nodos o endpoints afectados.
2. **Confirmación:**
   - Validar estado en `monitoring/health` y revisar `sloStatuses` para inventario y outbound.
   - Consultar `monitoring/metrics` para corroborar histogramas de duración y contadores de errores.
3. **Contención:**
   - Aplicar degradación controlada: limitar llamadas no críticas, activar colas de reintentos en clientes dependientes.
   - Si el fallo es parcial (ej. un warehouse), aislar el tenant/warehouse afectado y enrutar hacia nodos sanos.
4. **Recuperación:**
   - Reiniciar componentes específicos (pods/containers de inventario u outbound) según el proveedor de despliegue.
   - Validar que nuevas llamadas cumplen latencia objetivo (<500 ms p95 inventario, <750 ms p95 outbound) y error rate <1%.
   - Marcar en auditoría la ventana de impacto y documentar RCA.
5. **Prevención:**
   - Ajustar presupuestos de error o umbrales en `configuration/alerts.yml` si es necesario.
   - Añadir casos a los tests de resiliencia en `test/monitoring` para el patrón observado.

## Pasos operativos detallados
- **Recopilar señales:**
  - `GET /monitoring/health` para snapshot de SLO y contadores.
  - `GET /monitoring/alerts` para ver reglas activas y últimas evaluaciones.
  - `GET /monitoring/signals?service=inventory|outbound` para filtrar logs/trazas.
- **Validar impacto en datos:**
  - Revisar auditoría (`/audit/events`) para operaciones fallidas y usuarios afectados.
  - Verificar colas o tareas pendientes en procesos de outbound antes de reintentos masivos.
- **Mitigación rápida:**
  - Habilitar modos de solo lectura para inventario si la escritura está degradada.
  - Activar retry con backoff en integraciones downstream hasta que los SLO vuelvan a estado saludable.
- **Cierre:**
  - Confirmar que `alerts.active` esté vacío o en estado `resolved`.
  - Registrar tiempo de recuperación y acciones aplicadas en el registro de incidentes.

## Métricas y umbrales clave
- Latencia p95 inventario: **<= 500 ms**
- Latencia p95 outbound: **<= 750 ms**
- Error rate máximo: **< 1%** por servicio
- Disponibilidad mínima: **>= 99.5%** en ventana móvil de 60 minutos

## Roles y responsables
- **On-call:** atiende las alertas y ejecuta mitigaciones.
- **SRE/Plataforma:** ajusta reglas de alerta y capacidad.
- **Equipo de producto:** valida impacto funcional y comunica a clientes.

## Checklist post-mortem
- [ ] Alertas retornaron a estado verde.
- [ ] RCA y cronología documentadas.
- [ ] Tests de resiliencia actualizados con el incidente.
- [ ] Acciones preventivas priorizadas en backlog.
