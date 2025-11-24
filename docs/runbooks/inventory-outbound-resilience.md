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

## Procedimientos automatizables y comandos listos para pipelines
> Todos los comandos asumen `kubectl` autenticado contra el cluster productivo y acceso de red al clúster de servicios. Sustituye valores entre mayúsculas por los parámetros solicitados por el pipeline.

- **Reinicio controlado de servicios** (recuperación rápida sin recrear infraestructura):
  - **Precondiciones:** deployment saludable en Kubernetes y SLO en estado `warning` o `critical`.
  - **Comando:**
    ```bash
    kubectl rollout restart deployment/inventory-api -n supply-chain && \
    kubectl rollout restart deployment/outbound-api -n supply-chain
    ```
  - **Verificación automatizada:**
    ```bash
    kubectl rollout status deployment/inventory-api -n supply-chain --timeout=180s && \
    kubectl rollout status deployment/outbound-api -n supply-chain --timeout=180s
    ```

- **Aislamiento de tenant/warehouse afectado** (contención de fallos parciales):
  - **Precondiciones:** señales que apunten a errores localizados en un tenant/warehouse concreto; capacidad de enrutar a otros nodos sigue operativa.
  - **Comando:**
    ```bash
    kubectl -n supply-chain create job --from=cronjob/tenant-isolator isolate-tenant-$(date +%s) \
      -- "--tenant-id=${TENANT_ID}" "--warehouse-id=${WAREHOUSE_ID}" "--mode=read-only"
    ```
  - **Parámetros:**
    - `TENANT_ID`: identificador del tenant observado en alertas/auditoría.
    - `WAREHOUSE_ID`: warehouse que muestra degradación.
    - `mode`: `read-only` o `block-outbound` según alcance deseado.

- **Activar retrigger de outbound pendiente** (desencadenar reintentos controlados):
  - **Precondiciones:** colas de outbound estables y base de datos consistente; endpoint `/monitoring/health` en `ok`.
  - **Comando:**
    ```bash
    curl -X POST "${OUTBOUND_API_URL}/outbound/retry" \
      -H "Authorization: Bearer ${SERVICE_TOKEN}" \
      -d '{"tenantId":"'"${TENANT_ID}"'","force":true,"maxAttempts":3,"backoffMs":5000}'
    ```
  - **Parámetros:**
    - `OUTBOUND_API_URL`: URL base del servicio outbound accesible desde el runner CI/CD.
    - `SERVICE_TOKEN`: token con rol de servicio para ejecutar reintentos.
    - `TENANT_ID`: ámbito del reintento; evita reintentos globales por defecto.

- **Forzar modo solo lectura en inventario** (mitigación preventiva):
  - **Precondiciones:** escrituras fallando con error rate >1% y lecturas sanas.
  - **Comando:**
    ```bash
    kubectl -n supply-chain patch configmap inventory-flags \
      --type merge -p '{"data": {"inventory.mode": "read-only", "inventory.overrideExpiresAt": "'"$(date -u -d "+30 minutes" +%FT%TZ)"'"}}'
    ```
  - **Verificación automatizada:**
    ```bash
    kubectl -n supply-chain get configmap inventory-flags -o jsonpath='{.data}'
    ```

- **Rollback rápido a última versión estable** (cuando el despliegue reciente introduce errores):
  - **Precondiciones:** última revisión marcada como exitosa en Kubernetes; SLO degradado tras despliegue más reciente.
  - **Comando:**
    ```bash
    kubectl rollout undo deployment/inventory-api -n supply-chain --to-revision=${REVISION} && \
    kubectl rollout undo deployment/outbound-api -n supply-chain --to-revision=${REVISION}
    ```
  - **Parámetros:**
    - `REVISION`: número de revisión válido obtenido con `kubectl rollout history deployment/inventory-api -n supply-chain`.

- **Escalado vertical puntual para absorber carga** (cierre de incidente por saturación):
  - **Precondiciones:** CPU/memoria saturada y límites actuales insuficientes; capacidad del nodo disponible.
  - **Comando:**
    ```bash
    kubectl -n supply-chain patch deployment inventory-api \
      --type merge -p '{"spec": {"template": {"spec": {"containers": [{"name": "inventory-api", "resources": {"limits": {"cpu": "1500m", "memory": "1Gi"}}}]}}}}' && \
    kubectl -n supply-chain patch deployment outbound-api \
      --type merge -p '{"spec": {"template": {"spec": {"containers": [{"name": "outbound-api", "resources": {"limits": {"cpu": "1500m", "memory": "1Gi"}}}]}}}}'
    ```
  - **Verificación automatizada:** `kubectl top pod -n supply-chain` para confirmar reducción de saturación.

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
