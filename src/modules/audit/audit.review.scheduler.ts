import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccessReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

@Injectable()
export class AuditReviewScheduler {
  private readonly logger = new Logger(AuditReviewScheduler.name);

  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async registerReviewDecisions() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    for (const tenant of tenants) {
      const completedReviews = await this.prisma.accessReview.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: [AccessReviewStatus.APPROVED, AccessReviewStatus.REJECTED] },
          OR: [
            { lastExportedAt: null },
            { lastExportedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
          ],
        },
        take: 20,
      });

      for (const review of completedReviews) {
        await this.auditService.recordLog({
          tenantId: tenant.id,
          resource: 'ACCESS_REVIEW',
          action: review.status,
          entityId: review.id,
          metadata: {
            summary: review.summary,
            evidenceUrl: review.evidenceUrl,
            responsibleUserId: review.responsibleUserId,
            reviewerUserId: review.reviewerUserId,
            reviewedAt: review.reviewedAt,
          },
        });
        await this.auditService.markReviewExported(review.id);
      }
    }
    this.logger.log('Recorded review approvals/rejections for external audit traces');
  }
}
