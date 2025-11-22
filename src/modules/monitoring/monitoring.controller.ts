import { Controller, Get, Res } from '@nestjs/common';
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
}
