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
    const parsed = (service as any).parsedAlertConditions;
    parsed['inventory-latency'].windowMs = 1000;
    parsed['inventory-error-rate'].windowMs = 1000;

    // Peticiones exitosas iniciales
    service.recordRequestMetrics('GET', '/inventory/items', 200, 120);
    service.recordRequestMetrics('GET', '/inventory/items', 200, 180);

    // Degradación puntual con latencia alta y error 5xx
    service.recordRequestMetrics('GET', '/inventory/items', 503, 1500);
    service.recordRequestMetrics('POST', '/inventory/adjustment', 504, 1600);

    service.getSloStatuses();
    const alertStates = (service as any).alertStates;
    Object.values(alertStates).forEach((state: any) => (state.breachStart = Date.now() - 1200));

    const statuses = service.getSloStatuses();
    const inventoryStatus = statuses.find((status) => status.service === 'inventory');
    expect(inventoryStatus).toBeDefined();
    expect(inventoryStatus?.healthy).toBe(false);
    expect(inventoryStatus?.latencyP95).toBeGreaterThan(500);
    expect(inventoryStatus?.errorRate).toBeGreaterThan(0.01);

    const alerts = service.getAlertsOverview();
    const alertIds = alerts.active.map((alert) => alert.id);
    expect(alertIds).toEqual(expect.arrayContaining(['inventory-latency', 'inventory-error-rate']));
    expect(alerts.active.every((alert) => alert.breachDurationMs && alert.breachDurationMs >= 1000)).toBe(true);
  });

  it('no dispara alertas con una sola muestra hasta cumplir la ventana configurada', () => {
    const parsed = (service as any).parsedAlertConditions;
    parsed['inventory-latency'].windowMs = 2000;

    service.recordRequestMetrics('GET', '/inventory/items', 503, 1500);

    const initialAlerts = service.getAlertsOverview();
    expect(initialAlerts.totalActive).toBe(0);

    const alertStates = (service as any).alertStates;
    Object.values(alertStates).forEach((state: any) => (state.breachStart = Date.now() - 2500));

    const maturedAlerts = service.getAlertsOverview();
    expect(maturedAlerts.totalActive).toBe(1);
    expect(maturedAlerts.active[0].breachDurationMs).toBeGreaterThanOrEqual(2000);
  });

  it('mantiene trazas y logs al fallar parcialmente outbound', () => {
    const parsed = (service as any).parsedAlertConditions;
    parsed['outbound-latency'].windowMs = 500;
    parsed['outbound-error-rate'].windowMs = 500;

    service.recordRequestMetrics('GET', '/outbound/orders', 200, 300);
    service.recordRequestMetrics('GET', '/outbound/orders', 200, 320);
    service.recordRequestMetrics('POST', '/outbound/orders', 502, 900);
    service.recordTrace('outbound', 'POST /outbound/orders', 'failed', 900);

    service.getSloStatuses();
    const alertStates = (service as any).alertStates;
    Object.values(alertStates).forEach((state: any) => (state.breachStart = Date.now() - 800));

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

  it('rota la ventana de muestras y evalúa alertas con degradaciones recientes', () => {
    (service as any).windowSizeMs = 1000;
    const parsed = (service as any).parsedAlertConditions;
    parsed['inventory-latency'].windowMs = 500;
    parsed['inventory-error-rate'].windowMs = 500;

    service.recordRequestMetrics('GET', '/inventory/items', 503, 1500);
    const inventoryWindow = (service as any).sloWindows['inventory'];
    inventoryWindow.samples.forEach((sample: any) => (sample.timestamp = Date.now() - 120000));

    service.recordRequestMetrics('GET', '/inventory/items', 200, 120);

    let statuses = service.getSloStatuses();
    let inventoryStatus = statuses.find((status) => status.service === 'inventory');
    expect(inventoryStatus?.healthy).toBe(true);
    expect(inventoryStatus?.alerts.length).toBe(0);

    service.recordRequestMetrics('GET', '/inventory/items', 503, 1600);

    statuses = service.getSloStatuses();
    const alertStates = (service as any).alertStates;
    Object.values(alertStates).forEach((state: any) => (state.breachStart = Date.now() - 600));

    statuses = service.getSloStatuses();
    inventoryStatus = statuses.find((status) => status.service === 'inventory');
    expect(inventoryStatus?.healthy).toBe(false);
    expect(inventoryStatus?.errorRate).toBeGreaterThan(0.01);

    const alerts = service.getAlertsOverview();
    const inventoryAlertIds = alerts.active.map((alert) => alert.id);
    expect(inventoryAlertIds).toEqual(expect.arrayContaining(['inventory-latency', 'inventory-error-rate']));
  });
});
