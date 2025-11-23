import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  createSubscription(tenantId: string, dto: CreateWebhookSubscriptionDto) {
    const prisma = this.prisma as any;
    return prisma.webhookSubscription.create({ data: { tenantId, ...dto } });
  }

  async updateSubscription(tenantId: string, id: string, dto: UpdateWebhookSubscriptionDto) {
    const prisma = this.prisma as any;
    const existing = await prisma.webhookSubscription.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }
    return prisma.webhookSubscription.update({ where: { id }, data: dto });
  }

  listSubscriptions(tenantId: string, eventType?: string) {
    const prisma = this.prisma as any;
    return prisma.webhookSubscription.findMany({ where: { tenantId, eventType } });
  }

  deleteSubscription(tenantId: string, id: string) {
    const prisma = this.prisma as any;
    return prisma.webhookSubscription.update({ where: { id }, data: { isActive: false } });
  }

  async emitEvent(tenantId: string, eventType: string, payload: any) {
    const prisma = this.prisma as any;
    const targets = await prisma.webhookSubscription.findMany({
      where: { tenantId, eventType, isActive: true },
    });
    for (const target of targets) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (target.secret) {
          headers['x-webhook-secret'] = target.secret;
        }
        await axios.post(target.targetUrl, payload, { headers });
        await this.audit.recordLog({
          tenantId,
          userId: undefined,
          resource: 'WEBHOOK',
          action: 'EMIT',
          entityId: target.id,
          metadata: { eventType },
        });
      } catch (error) {
        await this.audit.recordLog({
          tenantId,
          userId: undefined,
          resource: 'WEBHOOK',
          action: 'ERROR',
          entityId: target.id,
          metadata: { eventType, error: String(error) },
        });
      }
    }
  }
}
