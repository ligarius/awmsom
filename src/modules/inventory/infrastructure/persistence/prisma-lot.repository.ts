import { Injectable } from '@nestjs/common';
import { BatchStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Lot } from '../../domain/entities/lot.entity';
import { LotState } from '../../domain/enums/lot-state.enum';
import { LOT_REPOSITORY, LotRepository } from '../../domain/repositories/lot.repository';
import { TenantContextService } from '../../../../common/tenant-context.service';

@Injectable()
export class PrismaLotRepository implements LotRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByProductAndCode(productId: string, code: string): Promise<Lot | null> {
    const tenantId = this.tenantContext.getTenantId();
    const record = await this.prisma.batch.findFirst({
      where: { productId, batchCode: code, tenantId },
    });

    return record ? this.toDomain(record) : null;
  }

  async save(lot: Lot): Promise<Lot> {
    if (lot.id) {
      const record = await this.prisma.batch.update({
        where: { id: lot.id },
        data: {
          expiryDate: lot.expirationDate,
          status: this.mapLotState(lot.state),
          updatedBy: lot.updatedBy,
        },
      });

      return this.toDomain(record);
    }

    const tenantId = this.tenantContext.getTenantId();
    const record = await this.prisma.batch.create({
      data: {
        tenantId,
        productId: lot.productId,
        batchCode: lot.code,
        code: lot.code,
        expiryDate: lot.expirationDate,
        status: this.mapLotState(lot.state),
        createdBy: lot.createdBy,
        updatedBy: lot.updatedBy,
      },
    });

    return this.toDomain(record);
  }

  private mapLotState(state: LotState): BatchStatus {
    return BatchStatus[state as keyof typeof BatchStatus];
  }

  private toDomain(record: {
    id: string;
    productId: string;
    batchCode: string;
    expiryDate: Date | null;
    status: BatchStatus;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
  }): Lot {
    return new Lot(
      record.productId,
      record.batchCode,
      record.expiryDate ?? undefined,
      record.status as unknown as LotState,
      record.id,
      record.createdAt,
      record.updatedAt,
      record.createdBy ?? undefined,
      record.updatedBy ?? undefined,
    );
  }
}
