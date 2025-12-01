import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRetentionSettingsDto } from './dto/update-retention-settings.dto';
import { UpdateReviewSettingsDto } from './dto/update-review-settings.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultRetentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 365);

  private resolveRetentionDays(value?: number | null) {
    const numericValue = Number(value ?? this.defaultRetentionDays);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
    return 365;
  }

  async getComplianceSettings(tenantId: string) {
    const settings = await this.prisma.complianceSetting.findUnique({ where: { tenantId } });

    return {
      retentionDays: this.resolveRetentionDays(settings?.retentionDays),
      lastUpdatedAt: settings?.updatedAt,
      updatedBy: settings?.updatedBy,
    };
  }

  async updateComplianceSettings(tenantId: string, dto: UpdateRetentionSettingsDto, userId?: string) {
    const record = await this.prisma.complianceSetting.upsert({
      where: { tenantId },
      create: { tenantId, retentionDays: dto.retentionDays, updatedBy: userId },
      update: { retentionDays: dto.retentionDays, updatedBy: userId },
    });

    return {
      retentionDays: record.retentionDays,
      lastUpdatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    };
  }

  async getReviewSettings(tenantId: string) {
    const settings = await this.prisma.permissionReviewSetting.findUnique({ where: { tenantId } });

    return {
      frequency: settings?.frequency ?? 'quarterly',
      nextReviewDate: settings?.nextReviewDate,
      notifyDaysBefore: settings?.notifyDaysBefore ?? 7,
      lastRunAt: settings?.lastRunAt,
    };
  }

  async updateReviewSettings(tenantId: string, dto: UpdateReviewSettingsDto, userId?: string) {
    const record = await this.prisma.permissionReviewSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        frequency: dto.frequency,
        nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : undefined,
        notifyDaysBefore: dto.notifyDaysBefore,
        updatedBy: userId,
      },
      update: {
        frequency: dto.frequency,
        nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : null,
        notifyDaysBefore: dto.notifyDaysBefore,
        updatedBy: userId,
      },
    });

    return {
      frequency: record.frequency,
      nextReviewDate: record.nextReviewDate,
      notifyDaysBefore: record.notifyDaysBefore,
      lastRunAt: record.lastRunAt,
    };
  }
}
