import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  createPlan(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({ data: dto as Prisma.SubscriptionPlanCreateInput });
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }
    return this.prisma.subscriptionPlan.update({ where: { id }, data: dto });
  }

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async assignPlanToTenant(tenantId: string, planId: string) {
    const [tenant, plan] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: plan.code,
        planCode: plan.code as PlanCode,
        planId: plan.id,
        subscriptionStatus: 'ACTIVE',
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        tenantId,
        eventType: 'PLAN_CHANGED',
        metadata: { previousPlan: tenant.planCode ?? tenant.plan, newPlan: plan.code },
      },
    });

    return { message: 'Plan updated', tenantId, planId };
  }
}
