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
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      include: { permissionReviewSetting: true },
    });
    for (const tenant of tenants) {
      const settings = tenant.permissionReviewSetting;
      const nextReviewDate = settings?.nextReviewDate;

      if (!nextReviewDate || nextReviewDate > new Date()) {
        continue;
      }

      const frequency = settings?.frequency ?? 'quarterly';

      try {
        await this.rbacService.generateAccessReview(tenant.id, { summary: 'Revisión programada' });
        await this.prisma.permissionReviewSetting.upsert({
          where: { tenantId: tenant.id },
          create: {
            tenantId: tenant.id,
            frequency,
            nextReviewDate: this.calculateNextReviewDate(nextReviewDate, frequency),
            notifyDaysBefore: settings?.notifyDaysBefore ?? 7,
            lastRunAt: new Date(),
          },
          update: {
            nextReviewDate: this.calculateNextReviewDate(nextReviewDate, frequency),
            lastRunAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.warn(`Failed scheduled access review for tenant ${tenant.id}: ${String(error)}`);
      }
    }
    this.logger.log(`Scheduled access review scans for ${tenants.length} tenants`);
  }

  private calculateNextReviewDate(base: Date, frequency: string) {
    const nextDate = new Date(base);
    if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 3);
    }
    return nextDate;
  }
}
