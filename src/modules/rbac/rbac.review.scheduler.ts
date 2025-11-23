import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from './rbac.service';

@Injectable()
export class RbacReviewScheduler {
  private readonly logger = new Logger(RbacReviewScheduler.name);

  constructor(private readonly prisma: PrismaService, private readonly rbacService: RbacService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async enqueueAccessReviews() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    for (const tenant of tenants) {
      try {
        await this.rbacService.generateAccessReview(tenant.id, { summary: 'Revisión programada' });
      } catch (error) {
        this.logger.warn(`Failed scheduled access review for tenant ${tenant.id}: ${String(error)}`);
      }
    }
    this.logger.log(`Scheduled access review scans for ${tenants.length} tenants`);
  }
}
