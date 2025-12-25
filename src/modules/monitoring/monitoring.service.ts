import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export type ServiceName = 'inventory' | 'outbound' | 'general';

interface SloObjective {
  id: ServiceName | string;
  service: ServiceName;
  endpointPrefix: string;
  targetLatencyMs: number;
  targetAvailability: number;
  targetErrorRate: number;
  description?: string;
}

export interface AlertRule {
  id: string;
  slo: string;
  severity: 'critical' | 'warning';
  condition: string;
  action: string;
}

interface ParsedAlertCondition {
  metric?: 'latency_p95' | 'error_rate' | 'availability';
  comparator?: '>' | '<';
  thresholdKey?: keyof SloObjective;
  windowMs: number;
}

interface AlertState {
  breachStart?: number;
  breachDurationMs?: number;
}

interface SloWindowState {
  samples: SloSample[];
  lastUpdated?: string;
}

export interface SloStatus {
  id: string;
  service: ServiceName;
  description?: string;
  latencyP95: number;
  availability: number;
  errorRate: number;
  healthy: boolean;
  alerts: (AlertRule & { breachStartedAt?: string; breachDurationMs?: number })[];
  lastUpdated?: string;
}

export interface ServiceSignal {
  service: ServiceName;
  level: 'info' | 'warning' | 'error';
  message: string;
  traceId?: string;
  timestamp: string;
}

export interface TraceSignal {
  service: ServiceName;
  span: string;
  status: 'ok' | 'degraded' | 'failed';
  durationMs?: number;
  timestamp: string;
}

interface SloSample {
  timestamp: number;
  durationMs: number;
  statusCode: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly register: Registry;
  private readonly requestCounter: Counter<'method' | 'path' | 'statusCode'>;
  private readonly durationHistogram: Histogram<'method' | 'path' | 'statusCode'>;
  private totalRequests = 0;
  private readonly sloObjectives: SloObjective[];
  private readonly alertRules: AlertRule[];
  private readonly parsedAlertConditions: Record<string, ParsedAlertCondition> = {};
  private readonly alertStates: Record<string, AlertState> = {};
  private readonly sloWindows: Record<string, SloWindowState> = {};
  private readonly serviceSignals: ServiceSignal[] = [];
  private readonly traceSignals: TraceSignal[] = [];
  private readonly windowSizeMs: number;

  constructor(private readonly auditService: AuditService) {
    const { sloObjectives, alertRules, windowMs } = this.loadAlertConfiguration();
    this.sloObjectives = sloObjectives;
    this.alertRules = alertRules;
    this.windowSizeMs = windowMs;
    this.alertRules.forEach((rule) => {
      this.parsedAlertConditions[rule.id] = this.parseAlertCondition(rule.condition);
    });
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register });

    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests received.',
      labelNames: ['method', 'path', 'statusCode'],
      registers: [this.register],
    });

    this.durationHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Histogram of HTTP request durations in seconds.',
      labelNames: ['method', 'path', 'statusCode'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.register],
    });
  }

  recordRequestMetrics(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ) {
    const labels = { method, path, statusCode: statusCode.toString() };
    this.requestCounter.inc(labels);
    this.durationHistogram.observe(labels, durationMs / 1000);
    this.totalRequests += 1;

    const service = this.resolveServiceFromPath(path);
    this.updateSloWindow(service, durationMs, statusCode);
    if (statusCode >= 500) {
      this.recordServiceLog(service, 'error', `Error ${statusCode} detected at ${path}`);
    }
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getMetricsContentType(): string {
    return this.register.contentType;
  }

  async getHealthSummary() {
    const sloStatuses = this.getSloStatuses();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      audit: {
        events: this.auditService.getEvents().length,
        traces: this.auditService.getTraces().length,
        encryptionEnabled: this.auditService.isEncryptionEnabled(),
      },
      metrics: {
        totalRequests: this.totalRequests,
      },
      sloStatuses,
    };
  }

  getSloStatuses(): SloStatus[] {
    const now = Date.now();
    return this.sloObjectives.map((slo) => {
      const state = this.sloWindows[slo.id] ?? {
        samples: [],
      };
      const samples = this.pruneWindow(state, now);
      const aggregates = samples.reduce(
        (acc, sample) => {
          acc.total += 1;
          if (sample.statusCode >= 500) {
            acc.errors += 1;
          } else {
            acc.available += 1;
          }
          acc.durations.push(sample.durationMs);
          return acc;
        },
        { total: 0, errors: 0, available: 0, durations: [] as number[] },
      );

      const latencyP95 = this.calculateP95(aggregates.durations);
      const errorRate = aggregates.total === 0 ? 0 : aggregates.errors / aggregates.total;
      const availability = aggregates.total === 0 ? 1 : aggregates.available / aggregates.total;
      const metrics = { latencyP95, errorRate, availability };
      const evaluatedAlerts = this.alertRules
        .filter((rule) => rule.slo === slo.id)
        .map((rule) => this.evaluateAlertRule(rule, metrics, slo, now))
        .filter((alert) => alert.active)
        .map((alert) => ({
          ...alert.rule,
          breachStartedAt: alert.breachStart ? new Date(alert.breachStart).toISOString() : undefined,
          breachDurationMs: alert.breachDurationMs,
        }));

      const healthy = evaluatedAlerts.length === 0;

      return {
        id: slo.id,
        service: slo.service,
        description: slo.description,
        latencyP95,
        availability,
        errorRate,
        healthy,
        alerts: evaluatedAlerts,
        lastUpdated: state.lastUpdated,
      };
    });
  }

  getAlertsOverview() {
    const sloStatuses = this.getSloStatuses();
    const active = sloStatuses
      .filter((status) => !status.healthy)
      .flatMap((status) => status.alerts.map((alert) => ({ ...alert, service: status.service })));

    return {
      active,
      evaluatedAt: new Date().toISOString(),
      totalActive: active.length,
    };
  }

  recordServiceLog(service: ServiceName, level: 'info' | 'warning' | 'error', message: string, traceId?: string) {
    const entry: ServiceSignal = {
      service,
      level,
      message,
      traceId,
      timestamp: new Date().toISOString(),
    };
    this.serviceSignals.push(entry);
    if (this.serviceSignals.length > 100) {
      this.serviceSignals.shift();
    }
  }

  recordTrace(service: ServiceName, span: string, status: 'ok' | 'degraded' | 'failed', durationMs?: number) {
    const entry: TraceSignal = {
      service,
      span,
      status,
      durationMs,
      timestamp: new Date().toISOString(),
    };
    this.traceSignals.push(entry);
    if (this.traceSignals.length > 100) {
      this.traceSignals.shift();
    }
    this.auditService.recordTrace(entry);
  }

  getSignals(filter?: { service?: ServiceName; level?: ServiceSignal['level'] }) {
    const logs = this.serviceSignals.filter((signal) =>
      (!filter?.service || signal.service === filter.service) && (!filter?.level || signal.level === filter.level),
    );
    const traces = this.traceSignals.filter((signal) => !filter?.service || signal.service === filter.service);

    return {
      logs,
      traces,
    };
  }

  private evaluateAlertRule(
    rule: AlertRule,
    metrics: { latencyP95: number; errorRate: number; availability: number },
    slo: SloObjective,
    now: number,
  ): { rule: AlertRule; active: boolean; breachStart?: number; breachDurationMs?: number } {
    const parsed = this.parsedAlertConditions[rule.id] ?? { windowMs: 0 };
    const metricValue =
      parsed.metric === 'latency_p95'
        ? metrics.latencyP95
        : parsed.metric === 'error_rate'
        ? metrics.errorRate
        : parsed.metric === 'availability'
        ? metrics.availability
        : undefined;
    const thresholdValue = parsed.thresholdKey ? (slo as any)[parsed.thresholdKey] : undefined;

    const conditionMet =
      metricValue !== undefined &&
      thresholdValue !== undefined &&
      ((parsed.comparator === '>' && metricValue > thresholdValue) ||
        (parsed.comparator === '<' && metricValue < thresholdValue));

    if (conditionMet) {
      const state = this.alertStates[rule.id] ?? {};
      state.breachStart ??= now;
      state.breachDurationMs = now - state.breachStart;
      this.alertStates[rule.id] = state;
      const active = state.breachDurationMs >= parsed.windowMs;
      return {
        rule,
        active,
        breachStart: state.breachStart,
        breachDurationMs: state.breachDurationMs,
      };
    }

    delete this.alertStates[rule.id];
    return { rule, active: false };
  }

  private parseAlertCondition(condition: string): ParsedAlertCondition {
    const baseWindow = this.windowSizeMs ?? 0;
    const match = condition
      .trim()
      .match(/^(latency_p95|error_rate|availability)\s*(>|<)\s*(\w+)\s*for\s*(\d+)\s*([smhd])$/i);

    if (!match) {
      return { windowMs: baseWindow };
    }

    const [, metric, comparator, thresholdKey, value, unit] = match;
    const windowMs = this.parseWindow(`${value}${unit}`);

    return {
      metric: metric.toLowerCase() as ParsedAlertCondition['metric'],
      comparator: comparator as ParsedAlertCondition['comparator'],
      thresholdKey: thresholdKey as ParsedAlertCondition['thresholdKey'],
      windowMs,
    };
  }

  private loadAlertConfiguration(): { sloObjectives: SloObjective[]; alertRules: AlertRule[]; windowMs: number } {
    const configPath = path.join(process.cwd(), 'configuration', 'alerts.yml');
    const defaults = this.getDefaultAlerts();
    try {
      if (!fs.existsSync(configPath)) {
        this.logger.warn(`Alert configuration not found at ${configPath}, using defaults.`);
        return { ...defaults, windowMs: this.parseWindow(defaults.window) };
      }
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = yaml.load(raw) as any;
      return {
        sloObjectives: parsed?.slo ?? defaults.sloObjectives,
        alertRules: parsed?.alerts ?? defaults.alertRules,
        windowMs: this.parseWindow(parsed?.window ?? defaults.window),
      };
    } catch (error) {
      this.logger.warn(`Failed to load alert config: ${String(error)}`);
      return { ...defaults, windowMs: this.parseWindow(defaults.window) };
    }
  }

  private getDefaultAlerts(): { sloObjectives: SloObjective[]; alertRules: AlertRule[]; window: string } {
    const sloObjectives: SloObjective[] = [
      {
        id: 'inventory',
        service: 'inventory',
        endpointPrefix: '/inventory',
        targetLatencyMs: 500,
        targetAvailability: 0.995,
        targetErrorRate: 0.01,
        description: 'Respuestas consistentes para operaciones de inventario.',
      },
      {
        id: 'outbound',
        service: 'outbound',
        endpointPrefix: '/outbound',
        targetLatencyMs: 750,
        targetAvailability: 0.995,
        targetErrorRate: 0.01,
        description: 'Flujo de fulfillment y despacho.',
      },
    ];

    const alertRules: AlertRule[] = [
      {
        id: 'inventory-latency',
        slo: 'inventory',
        severity: 'critical',
        condition: 'latency_p95 > targetLatencyMs for 5m',
        action: 'Escalar al on-call y aislar warehouse afectado.',
      },
      {
        id: 'inventory-error-rate',
        slo: 'inventory',
        severity: 'warning',
        condition: 'error_rate > targetErrorRate for 3m',
        action: 'Activar reintentos con backoff y revisar dependencias.',
      },
      {
        id: 'outbound-latency',
        slo: 'outbound',
        severity: 'critical',
        condition: 'latency_p95 > targetLatencyMs for 5m',
        action: 'Priorizar tareas de picking/packing críticas y pausar no urgentes.',
      },
      {
        id: 'outbound-error-rate',
        slo: 'outbound',
        severity: 'warning',
        condition: 'error_rate > targetErrorRate for 3m',
        action: 'Validar colas de despacho y capacidad de carriers.',
      },
    ];

    return { sloObjectives, alertRules, window: '60m' };
  }

  private resolveServiceFromPath(pathname: string): ServiceName {
    if (pathname.startsWith('/inventory')) {
      return 'inventory';
    }
    if (pathname.startsWith('/outbound')) {
      return 'outbound';
    }
    return 'general';
  }

  private parseWindow(rawWindow?: string): number {
    const fallbackMs = 60 * 60 * 1000;
    if (!rawWindow) {
      return fallbackMs;
    }
    const match = rawWindow.toString().trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!match) {
      return fallbackMs;
    }
    const value = Number(match[1]);
    const unit = match[2]?.toLowerCase() ?? 'm';
    const multiplier = unit === 'h' ? 60 * 60 * 1000 : unit === 'd' ? 24 * 60 * 60 * 1000 : unit === 's' ? 1000 : 60 * 1000;
    return value * multiplier;
  }

  private pruneWindow(window: SloWindowState, now: number): SloSample[] {
    const cutoff = now - this.windowSizeMs;
    window.samples = window.samples.filter((sample) => sample.timestamp >= cutoff);
    return window.samples;
  }

  private updateSloWindow(service: ServiceName, durationMs: number, statusCode: number) {
    const slo = this.sloObjectives.find((candidate) => candidate.service === service);
    if (!slo) {
      return;
    }
    const window =
      this.sloWindows[slo.id] ?? {
        samples: [],
      };

    const now = Date.now();
    window.samples.push({
      timestamp: now,
      durationMs,
      statusCode,
    });

    this.pruneWindow(window, now);
    window.lastUpdated = new Date(now).toISOString();
    this.sloWindows[slo.id] = window;
  }

  private calculateP95(values: number[]): number {
    if (!values.length) {
      return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[index];
  }
}
