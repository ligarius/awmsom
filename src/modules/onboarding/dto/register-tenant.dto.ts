import { PlanCode } from '@prisma/client';

export class RegisterTenantDto {
  companyName!: string;
  adminName!: string;
  adminEmail!: string;
  adminPassword!: string;
  planCode?: PlanCode;
  billingEmail?: string;
}
