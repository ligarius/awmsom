import { PlanCode } from '@prisma/client';

export class UpdateSubscriptionPlanDto {
  code?: PlanCode;
  name?: string;
  description?: string;
  maxWarehouses?: number;
  maxUsers?: number;
  maxApiKeys?: number;
  maxMonthlyOrders?: number;
  maxMonthlyShipments?: number;
  maxIntegrations?: number;
  isActive?: boolean;
}
