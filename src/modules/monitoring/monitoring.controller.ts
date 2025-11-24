import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  async getMetrics(@Res({ passthrough: true }) res: Response) {
    const metrics = await this.monitoringService.getMetrics();
    res.header('Content-Type', this.monitoringService.getMetricsContentType());
    return metrics;
  }

  @Get('health')
  async getHealth() {
    return this.monitoringService.getHealthSummary();
  }

  @Get('slo')
  async getSloStatuses() {
    return this.monitoringService.getSloStatuses();
  }

  @Get('alerts')
  async getAlerts() {
    return this.monitoringService.getAlertsOverview();
  }

  @Get('signals')
  async getSignals(
    @Query('service') service?: 'inventory' | 'outbound' | 'general',
    @Query('level') level?: 'info' | 'warning' | 'error',
  ) {
    return this.monitoringService.getSignals({ service, level });
  }
}
