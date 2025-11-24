import { MonitoringService } from '../../src/modules/monitoring/monitoring.service';

describe('MonitoringService resiliencia y caos', () => {
  const traces: any[] = [];
  const auditServiceMock = {
    getEvents: () => [],
    getTraces: () => traces,
    recordTrace: (trace: any) => traces.push(trace),
  } as any;

  let service: MonitoringService;

  beforeEach(() => {
    traces.length = 0;
    service = new MonitoringService(auditServiceMock);
  });

  it('activa alertas cuando inventario supera umbrales de latencia/error', () => {
    // Peticiones exitosas iniciales
    service.recordRequestMetrics('GET', '/inventory/items', 200, 120);
    service.recordRequestMetrics('GET', '/inventory/items', 200, 180);

    // Degradación puntual con latencia alta y error 5xx
    service.recordRequestMetrics('GET', '/inventory/items', 503, 1500);
    service.recordRequestMetrics('POST', '/inventory/adjustment', 504, 1600);

    const statuses = service.getSloStatuses();
    const inventoryStatus = statuses.find((status) => status.service === 'inventory');
    expect(inventoryStatus).toBeDefined();
    expect(inventoryStatus?.healthy).toBe(false);
    expect(inventoryStatus?.latencyP95).toBeGreaterThan(500);
    expect(inventoryStatus?.errorRate).toBeGreaterThan(0.01);

    const alerts = service.getAlertsOverview();
    const alertIds = alerts.active.map((alert) => alert.id);
    expect(alertIds).toEqual(expect.arrayContaining(['inventory-latency', 'inventory-error-rate']));
  });

  it('mantiene trazas y logs al fallar parcialmente outbound', () => {
    service.recordRequestMetrics('GET', '/outbound/orders', 200, 300);
    service.recordRequestMetrics('GET', '/outbound/orders', 200, 320);
    service.recordRequestMetrics('POST', '/outbound/orders', 502, 900);
    service.recordTrace('outbound', 'POST /outbound/orders', 'failed', 900);

    const alerts = service.getAlertsOverview();
    expect(alerts.totalActive).toBeGreaterThanOrEqual(1);

    const signals = service.getSignals({ service: 'outbound' });
    expect(signals.traces.length).toBeGreaterThan(0);
    expect(signals.logs.some((log) => log.level === 'error')).toBe(true);

    // Aún se registran métricas para demostrar continuidad operativa
    const sloStatus = service.getSloStatuses().find((status) => status.service === 'outbound');
    expect(sloStatus?.errorRate).toBeGreaterThan(0);
    expect(sloStatus?.availability).toBeLessThan(1);
  });
});
