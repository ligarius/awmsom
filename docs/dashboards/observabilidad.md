# Dashboards de observabilidad para APIs críticas

## Propósito
Centralizar visualizaciones de salud para inventario y outbound, alineadas con los SLO definidos en `configuration/alerts.yml` y expuestos por `MonitoringService`.

## Secciones clave
- **Visión general:**
  - Panel de disponibilidad con porcentaje por servicio (ventana 60 minutos).
  - Contador de alertas activas y severidad.
- **Rendimiento:**
  - Gráfica de latencia p95/p99 por endpoint (`/inventory/**`, `/outbound/**`).
  - Histogramas `http_request_duration_seconds` para detectar colas o timeouts.
- **Errores:**
  - Tasa de errores por servicio y por tipo de error (4xx vs 5xx).
  - Tabla de endpoints con mayor contribución al error budget.
- **Trazas y logs recientes:**
  - Últimas entradas de `monitoring/signals` filtradas por servicio.
  - Correlación con eventos de auditoría (ids de traza compartidos).

## Fuentes de datos
- Endpoint Prometheus: `GET /monitoring/metrics`.
- Estado de SLO y alertas: `GET /monitoring/alerts` y `GET /monitoring/slo`.
- Logs/trazas enriquecidos: `GET /monitoring/signals` con filtros `service` y `level`.

## Alertas visibles
- Latencia p95 > objetivo por 5 minutos.
- Error rate > 1% en ventana móvil de 10 minutos.
- Disponibilidad < 99.5% en última hora.

## Operación
1. Revisión diaria de tendencias de latencia y errores.
2. Validación de cierre de alertas después de despliegues.
3. Alimentar retrospectivas con capturas de estos paneles.
