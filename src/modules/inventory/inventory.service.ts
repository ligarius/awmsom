import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdjustmentType, CycleCountStatus, MovementStatus, MovementType, Prisma, StockStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { ConfigService } from '../config/config.service';
import {
  AddCycleCountLinesDto,
  CreateCycleCountTaskDto,
  SubmitCycleCountResultDto,
} from './dto/cycle-count.dto';
import { CreateInventoryAdjustmentDto } from './dto/inventory-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
  ) {}

  health() {
    this.tenantContext.getTenantId();
    return { status: 'ok' };
  }

  async createCycleCountTask(dto: CreateCycleCountTaskDto) {
    const tenantId = this.tenantContext.getTenantId();
    const tenantConfig = await this.configService.getTenantConfig(tenantId);
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId } as any,
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (!tenantConfig.enableCycleCounting) {
      throw new BadRequestException('Cycle counting disabled for this tenant');
    }

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.cycleCountTask.create({
        data: {
          tenantId,
          warehouseId: dto.warehouseId,
          description: dto.description,
          status: CycleCountStatus.PENDING,
        } as any,
      });

      if (dto.lines?.length) {
        await this.addCycleCountLines(task.id, { lines: dto.lines }, tx, tenantId);
      } else {
        const policies = await this.configService.getInventoryPolicies(tenantId, dto.warehouseId);
        const hasPolicyFrequency = policies.some((policy) => policy.cycleCountFreqDays !== null);
        const shouldSuggest = hasPolicyFrequency || tenantConfig.cycleCountDefaultFreqDays !== null;

        if (shouldSuggest) {
          const inventoryCandidates = await tx.inventory.findMany({
            where: { tenantId, location: { warehouseId: dto.warehouseId, tenantId } as any } as any,
            include: { batch: true },
            take: 50,
          });

          const lines = inventoryCandidates.map((inv) => ({
            productId: inv.productId,
            batchId: inv.batchId ?? undefined,
            locationId: inv.locationId,
            uom: inv.uom,
            expectedQty: Number(inv.quantity),
          }));

          if (lines.length) {
            await this.addCycleCountLines(task.id, { lines }, tx, tenantId);
          }
        }
      }

      return task;
    });
  }

  async addCycleCountLines(
    taskId: string,
    dto: AddCycleCountLinesDto,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
    tenantId?: string,
  ) {
    const currentTenantId = tenantId ?? this.tenantContext.getTenantId();

    const task = await prismaClient.cycleCountTask.findFirst({
      where: { id: taskId, tenantId: currentTenantId } as any,
    });
    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }

    if (task.status !== CycleCountStatus.PENDING && task.status !== CycleCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot add lines to a completed or cancelled task');
    }

    const seenCombinations = new Set<string>();
    const combinations = [] as {
      productId: string;
      batchId: string | null;
      locationId: string;
      uom: string;
    }[];

    for (const line of dto.lines) {
      const key = `${line.productId}|${line.batchId ?? null}|${line.locationId}|${line.uom}`;
      if (seenCombinations.has(key)) {
        throw new BadRequestException('Duplicate cycle count lines in request');
      }

      seenCombinations.add(key);
      combinations.push({
        productId: line.productId,
        batchId: line.batchId ?? null,
        locationId: line.locationId,
        uom: line.uom,
      });
    }

    if (combinations.length) {
      const existingLines = await prismaClient.cycleCountLine.count({
        where: {
          tenantId: currentTenantId,
          cycleCountTaskId: taskId,
          OR: combinations.map((combination) => ({
            productId: combination.productId,
            batchId: combination.batchId,
            locationId: combination.locationId,
            uom: combination.uom,
          })),
        } as any,
      });

      if (existingLines > 0) {
        throw new BadRequestException('Duplicate cycle count lines for task');
      }
    }

    const linesToCreate = [] as Prisma.CycleCountLineCreateManyInput[];

    for (const line of dto.lines) {
      const product = await prismaClient.product.findFirst({
        where: { id: line.productId, tenantId: currentTenantId } as any,
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      if (line.batchId) {
        const batch = await prismaClient.batch.findFirst({
          where: { id: line.batchId, tenantId: currentTenantId } as any,
        });
        if (!batch) {
          throw new BadRequestException('Batch not found');
        }

        if (batch.productId !== line.productId) {
          throw new BadRequestException('Batch does not belong to product');
        }
      }

      const location = await prismaClient.location.findFirst({
        where: { id: line.locationId, tenantId: currentTenantId } as any,
      });
      if (!location) {
        throw new BadRequestException('Location not found');
      }

      if (location.warehouseId !== task.warehouseId) {
        throw new BadRequestException('Location does not belong to cycle count warehouse');
      }

      const expectedQty =
        line.expectedQty === undefined
          ? await this.getExpectedQty(
              line.productId,
              line.batchId,
              line.locationId,
              line.uom,
              prismaClient,
              currentTenantId,
            )
          : new Prisma.Decimal(line.expectedQty);

      linesToCreate.push({
        tenantId: currentTenantId,
        cycleCountTaskId: taskId,
        productId: line.productId,
        batchId: line.batchId,
        locationId: line.locationId,
        uom: line.uom,
        expectedQty,
      } as any);
    }

    if (linesToCreate.length) {
      await prismaClient.cycleCountLine.createMany({ data: linesToCreate });
    }

    return prismaClient.cycleCountLine.findMany({
      where: { cycleCountTaskId: taskId, tenantId: currentTenantId } as any,
    });
  }

  async startCycleCount(taskId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.cycleCountTask.findFirst({ where: { id: taskId, tenantId } as any });
    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }

    if (task.status !== CycleCountStatus.PENDING) {
      throw new BadRequestException('Only pending tasks can be started');
    }

    return this.prisma.cycleCountTask.update({
      where: { id: taskId } as any,
      data: { status: CycleCountStatus.IN_PROGRESS, startedAt: new Date() },
    });
  }

  async submitCycleCount(taskId: string, dto: SubmitCycleCountResultDto) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.cycleCountTask.findFirst({ where: { id: taskId, tenantId } as any });
    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }

    if (task.status !== CycleCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Task must be in progress to submit');
    }

    const now = new Date();
    const submittedLines = [] as { id: string; differenceQty: Prisma.Decimal; countedQty: Prisma.Decimal }[];

    await this.prisma.$transaction(async (tx) => {
      const pendingLines = await tx.cycleCountLine.findMany({
        where: { cycleCountTaskId: taskId, countedAt: null, tenantId } as any,
        select: { id: true },
      });

      const pendingLineIds = pendingLines.map((line) => line.id);
      const submittedLineIds = dto.lines.map((line) => line.lineId);

      const missingLines = pendingLineIds.filter((lineId) => !submittedLineIds.includes(lineId));
      if (missingLines.length) {
        throw new BadRequestException('All pending cycle count lines must be submitted');
      }

      const seenLineIds = new Set<string>();
      for (const line of dto.lines) {
        if (seenLineIds.has(line.lineId)) {
          throw new BadRequestException('Duplicate cycle count lines in submission');
        }

        seenLineIds.add(line.lineId);
        const existingLine = await tx.cycleCountLine.findFirst({ where: { id: line.lineId, tenantId } as any });
        if (!existingLine || existingLine.cycleCountTaskId !== taskId) {
          throw new NotFoundException(`Cycle count line ${line.lineId} not found for task`);
        }

        if (existingLine.countedAt) {
          throw new BadRequestException(`Cycle count line ${line.lineId} has already been counted`);
        }

        const countedQty = new Prisma.Decimal(line.countedQty);
        const differenceQty = countedQty.minus(existingLine.expectedQty);

        await tx.cycleCountLine.update({
          where: { id: line.lineId, tenantId } as any,
          data: {
            countedQty,
            differenceQty,
            countedAt: now,
            countedBy: 'system',
          },
        });

        submittedLines.push({ id: line.lineId, differenceQty, countedQty });
      }

      for (const line of submittedLines) {
        if (!line.differenceQty.isZero()) {
          const lineData = await tx.cycleCountLine.findFirst({ where: { id: line.id, tenantId } as any });
          if (!lineData) {
            continue;
          }

          const stockStatus = await this.determineCountStockStatus(
            lineData.productId,
            lineData.batchId ?? undefined,
            lineData.locationId,
            lineData.uom,
            tx,
            tenantId,
          );

          await this.applyInventoryAdjustment(
            {
              warehouseId: task.warehouseId,
              productId: lineData.productId,
              batchId: lineData.batchId ?? undefined,
              locationId: lineData.locationId,
              newQty: line.countedQty.toNumber(),
              uom: lineData.uom,
              stockStatus,
              reason: 'Cycle count adjustment',
              reference: taskId,
              createdBy: 'system',
            },
            tx,
            tenantId,
          );
        }
      }

      const remainingPendingLines = await tx.cycleCountLine.count({
        where: { cycleCountTaskId: taskId, countedAt: null, tenantId } as any,
      });

      if (remainingPendingLines === 0) {
        await tx.cycleCountTask.update({
          where: { id: taskId } as any,
          data: { status: CycleCountStatus.COMPLETED, completedAt: now },
        });
      }
    });

    return this.prisma.cycleCountTask.findUnique({
      where: { id: taskId, tenantId } as any,
      include: { lines: true },
    });
  }

  async listCycleCounts(params: { warehouseId?: string; status?: CycleCountStatus; from?: string; to?: string }) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.CycleCountTaskWhereInput = { tenantId } as any;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    return this.prisma.cycleCountTask.findMany({ where, include: { lines: true } });
  }

  async getCycleCountById(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.cycleCountTask.findFirst({
      where: { id, tenantId } as any,
      include: { lines: true },
    });
    if (!task) {
      throw new NotFoundException('Cycle count task not found');
    }
    return task;
  }

  async createInventoryAdjustment(dto: CreateInventoryAdjustmentDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.applyInventoryAdjustment({ ...dto, createdBy: 'system' }, this.prisma, tenantId);
  }

  async increaseStock(
    params: {
      warehouseId: string;
      productId: string;
      batchId?: string;
      locationId: string;
      quantity: number | Prisma.Decimal;
      uom: string;
      stockStatus: StockStatus;
    },
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
    tenantId?: string,
  ) {
    const currentTenantId = tenantId ?? this.tenantContext.getTenantId();
    const product = await prismaClient.product.findFirst({
      where: { id: params.productId, tenantId: currentTenantId } as any,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (params.batchId) {
      const batch = await prismaClient.batch.findFirst({
        where: { id: params.batchId, tenantId: currentTenantId } as any,
      });
      if (!batch) {
        throw new NotFoundException('Batch not found');
      }
    }

    const location = await prismaClient.location.findFirst({
      where: { id: params.locationId, tenantId: currentTenantId } as any,
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (location.warehouseId !== params.warehouseId) {
      throw new BadRequestException('Location does not belong to warehouse');
    }

    const incrementQty = new Prisma.Decimal(params.quantity);
    if (incrementQty.lte(0)) {
      throw new BadRequestException('Increase quantity must be greater than zero');
    }

    const existingInventory = await prismaClient.inventory.findFirst({
      where: {
        tenantId: currentTenantId,
        productId: params.productId,
        batchId: params.batchId ?? null,
        locationId: params.locationId,
        uom: params.uom,
        stockStatus: params.stockStatus,
      } as any,
    });

    if (existingInventory) {
      return prismaClient.inventory.update({
        where: { id: existingInventory.id, tenantId: currentTenantId } as any,
        data: { quantity: new Prisma.Decimal(existingInventory.quantity).plus(incrementQty) },
      });
    }

    return prismaClient.inventory.create({
      data: {
        tenantId: currentTenantId,
        productId: params.productId,
        batchId: params.batchId,
        locationId: params.locationId,
        quantity: incrementQty,
        uom: params.uom,
        stockStatus: params.stockStatus,
      } as any,
    });
  }

  async listInventoryAdjustments(params: {
    warehouseId?: string;
    productId?: string;
    locationId?: string;
    from?: string;
    to?: string;
  }) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.InventoryAdjustmentWhereInput = { tenantId } as any;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.productId) where.productId = params.productId;
    if (params.locationId) where.locationId = params.locationId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    return this.prisma.inventoryAdjustment.findMany({ where });
  }

  async getInventoryAdjustmentById(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({ where: { id, tenantId } as any });
    if (!adjustment) {
      throw new NotFoundException('Inventory adjustment not found');
    }
    return adjustment;
  }

  async applyInventoryAdjustment(
    params: {
      warehouseId: string;
      productId: string;
      batchId?: string;
      locationId: string;
      newQty: number;
      uom?: string;
      stockStatus?: StockStatus;
      reason: string;
      reference?: string;
      createdBy?: string;
    },
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
    tenantId?: string,
  ) {
    const currentTenantId = tenantId ?? this.tenantContext.getTenantId();

    const product = await prismaClient.product.findFirst({
      where: { id: params.productId, tenantId: currentTenantId } as any,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const uom = params.uom ?? product.defaultUom;

    if (params.batchId) {
      const batch = await prismaClient.batch.findFirst({
        where: { id: params.batchId, tenantId: currentTenantId } as any,
      });
      if (!batch) {
        throw new NotFoundException('Batch not found');
      }
      // Blocked or recall batches are allowed for counting/adjustment but should be handled by downstream picking rules.
    }

    const location = await prismaClient.location.findFirst({
      where: { id: params.locationId, tenantId: currentTenantId } as any,
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (location.warehouseId !== params.warehouseId) {
      throw new BadRequestException('Location does not belong to warehouse');
    }

    const newQtyDecimal = new Prisma.Decimal(params.newQty);
    if (newQtyDecimal.isNeg()) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const stockStatus = params.stockStatus
      ?? (await this.determineCountStockStatus(
        params.productId,
        params.batchId,
        params.locationId,
        uom,
        prismaClient,
        currentTenantId,
      ));

    const existingInventory = await prismaClient.inventory.findFirst({
      where: {
        tenantId: currentTenantId,
        productId: params.productId,
        batchId: params.batchId ?? null,
        locationId: params.locationId,
        stockStatus,
        uom,
      } as any,
    });

    const previousQty = existingInventory ? new Prisma.Decimal(existingInventory.quantity) : new Prisma.Decimal(0);
    const differenceQty = newQtyDecimal.minus(previousQty);

    if (differenceQty.isZero()) {
      return existingInventory;
    }

    let inventoryRecord = existingInventory;
    if (existingInventory) {
      inventoryRecord = await prismaClient.inventory.update({
        where: { id: existingInventory.id, tenantId: currentTenantId } as any,
        data: { quantity: newQtyDecimal },
      });
    } else {
      inventoryRecord = await prismaClient.inventory.create({
        data: {
          tenantId: currentTenantId,
          productId: params.productId,
          batchId: params.batchId,
          locationId: params.locationId,
          quantity: newQtyDecimal,
          uom,
          stockStatus,
        } as any,
      });
    }

    const adjustmentType = differenceQty.gt(0)
      ? AdjustmentType.GAIN
      : differenceQty.lt(0)
        ? AdjustmentType.LOSS
        : AdjustmentType.CORRECTION;

    const movementHeader = await prismaClient.movementHeader.create({
      data: {
        tenantId: currentTenantId,
        movementType: MovementType.ADJUSTMENT,
        warehouseId: params.warehouseId,
        status: MovementStatus.COMPLETED,
        reference: params.reference,
        createdBy: params.createdBy,
      } as any,
    });

    await prismaClient.movementLine.create({
      data: {
        tenantId: currentTenantId,
        movementHeaderId: movementHeader.id,
        productId: params.productId,
        batchId: params.batchId,
        fromLocationId: differenceQty.lt(0) ? params.locationId : null,
        toLocationId: differenceQty.gt(0) ? params.locationId : null,
        quantity: differenceQty.abs(),
        uom,
      } as any,
    });

    await prismaClient.inventoryAdjustment.create({
      data: {
        tenantId: currentTenantId,
        warehouseId: params.warehouseId,
        productId: params.productId,
        batchId: params.batchId,
        locationId: params.locationId,
        inventoryId: inventoryRecord.id,
        movementHeaderId: movementHeader.id,
        adjustmentType,
        previousQty,
        newQty: newQtyDecimal,
        differenceQty,
        reason: params.reason,
        reference: params.reference,
        createdBy: params.createdBy,
      } as any,
    });

    return inventoryRecord;
  }

  private async getExpectedQty(
    productId: string,
    batchId: string | undefined,
    locationId: string,
    uom: string,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
    tenantId = this.tenantContext.getTenantId(),
  ): Promise<Prisma.Decimal> {
    const relevantStatuses = [
      StockStatus.AVAILABLE,
      StockStatus.RESERVED,
      StockStatus.PICKING,
      StockStatus.IN_TRANSIT_INTERNAL,
      StockStatus.QUARANTINE,
      StockStatus.BLOCKED,
    ];

    const inventory = await prismaClient.inventory.groupBy({
      where: {
        tenantId,
        productId,
        batchId: batchId ?? null,
        locationId,
        uom,
        stockStatus: { in: relevantStatuses },
      } as any,
      by: ['productId', 'batchId', 'locationId', 'uom'],
      _sum: { quantity: true },
    });

    const [firstRecord] = inventory ?? [];
    const sumQty = firstRecord?._sum?.quantity ?? new Prisma.Decimal(0);

    return new Prisma.Decimal(sumQty);
  }

  private async determineCountStockStatus(
    productId: string,
    batchId: string | undefined,
    locationId: string,
    uom: string,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
    tenantId = this.tenantContext.getTenantId(),
  ): Promise<StockStatus> {
    const inventoryByStatus =
      (await prismaClient.inventory.groupBy({
        where: {
          tenantId,
          productId,
          batchId: batchId ?? null,
          locationId,
          uom,
        } as any,
        by: ['stockStatus'],
        _sum: { quantity: true },
      })) ?? [];

    const availableEntry = inventoryByStatus.find((record) => {
      const qty = new Prisma.Decimal(record._sum?.quantity ?? 0);
      return record.stockStatus === StockStatus.AVAILABLE && qty.gt(0);
    });

    if (availableEntry) {
      return StockStatus.AVAILABLE;
    }

    if (inventoryByStatus.length) {
      const predominant = inventoryByStatus.reduce(
        (current, record) => {
          const qty = new Prisma.Decimal(record._sum?.quantity ?? 0);
          if (!current || qty.gt(current.qty)) {
            return { status: record.stockStatus, qty };
          }
          return current;
        },
        null as { status: StockStatus; qty: Prisma.Decimal } | null,
      );

      if (predominant) {
        return predominant.status;
      }
    }

    return StockStatus.AVAILABLE;
  }
  async listInventorySummary(filters: Record<string, string | undefined> = {}) {
    const tenantId = this.tenantContext.getTenantId();
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(200, Number(filters.limit ?? 20)));

    const rows = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        warehouseId: filters.warehouse || undefined,
        product: filters.sku
          ? { sku: { contains: filters.sku, mode: 'insensitive' } }
          : undefined,
      } as any,
      include: { product: true },
    });

    const summaryMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        totalUnits: number;
        totalUom?: string;
        batchIds: Set<string>;
        locationIds: Set<string>;
      }
    >();

    rows.forEach((row) => {
      const existing =
        summaryMap.get(row.productId) ??
        {
          productId: row.productId,
          sku: row.product?.sku ?? row.productId,
          name: row.product?.name ?? row.productId,
          totalUnits: 0,
          totalUom: row.uom,
          batchIds: new Set<string>(),
          locationIds: new Set<string>(),
        };
      existing.totalUnits += Number(row.quantity ?? 0);
      if (row.batchId) {
        existing.batchIds.add(row.batchId);
      }
      existing.locationIds.add(row.locationId);
      summaryMap.set(row.productId, existing);
    });

    const items = Array.from(summaryMap.values()).map((entry) => ({
      productId: entry.productId,
      sku: entry.sku,
      name: entry.name,
      totalUnits: entry.totalUnits,
      totalUom: entry.totalUom,
      batchCount: entry.batchIds.size,
      locationCount: entry.locationIds.size,
    }));

    items.sort((a, b) => a.sku.localeCompare(b.sku));

    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return {
      items: paged,
      page,
      pageSize: limit,
      total: items.length,
    };
  }

  async listInventoryByLocation(filters: Record<string, string | undefined>) {
    const tenantId = this.tenantContext.getTenantId();
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(200, Number(filters.limit ?? 20)));
    const skip = (page - 1) * limit;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.inventory.count({ where: { tenantId } }),
      this.prisma.inventory.findMany({
        where: { tenantId } as any,
        include: { product: true, location: true, batch: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        locationId: row.locationId,
        locationCode: row.location?.code ?? row.locationId,
        productId: row.productId,
        sku: row.product?.sku ?? row.productId,
        productName: row.product?.name,
        quantity: Number(row.quantity ?? 0),
        batch: row.batch?.batchCode ?? null,
        updatedAt: row.updatedAt,
      })),
      page,
      pageSize: limit,
      total,
    };
  }

  async listInventoryByBatch(filters: Record<string, string | undefined>) {
    const tenantId = this.tenantContext.getTenantId();
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(200, Number(filters.limit ?? 20)));

    const rows = await this.prisma.inventory.findMany({
      where: { tenantId, batchId: { not: null } } as any,
      include: { batch: true, product: true, location: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    });

    const batchMap = new Map<
      string,
      {
        id: string;
        productId: string;
        sku: string;
        productName?: string;
        quantity: number;
        expiresAt?: Date | null;
        warehouseName?: string;
        locationCode?: string;
      }
    >();

    rows.forEach((row) => {
      if (!row.batchId) return;
      const existing =
        batchMap.get(row.batchId) ??
        {
          id: row.batch?.batchCode ?? row.batchId,
          productId: row.productId,
          sku: row.product?.sku ?? row.productId,
          productName: row.product?.name,
          quantity: 0,
          expiresAt: row.batch?.expiryDate ?? null,
          warehouseName: row.warehouse?.name,
          locationCode: row.location?.code,
        };
      existing.quantity += Number(row.quantity ?? 0);
      batchMap.set(row.batchId, existing);
    });

    const items = Array.from(batchMap.values()).map((entry) => ({
      batch: entry.id,
      productId: entry.productId,
      sku: entry.sku,
      productName: entry.productName,
      quantity: entry.quantity,
      expiresAt: entry.expiresAt ? entry.expiresAt.toISOString() : undefined,
      warehouseName: entry.warehouseName,
      locationCode: entry.locationCode,
    }));

    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return {
      items: paged,
      page,
      pageSize: limit,
      total: items.length,
    };
  }

  async getProductInventoryDetail(productId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } as any });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const rows = await this.prisma.inventory.findMany({
      where: { tenantId, productId } as any,
      include: { batch: true, location: true },
    });

    const byLocation = new Map<string, number>();
    const batches = new Map<string, { quantity: number; expiresAt?: string }>();

    rows.forEach((row) => {
      const locKey = row.location?.code ?? row.locationId;
      byLocation.set(locKey, (byLocation.get(locKey) ?? 0) + Number(row.quantity ?? 0));
      if (row.batch?.batchCode) {
        const batchEntry = batches.get(row.batch.batchCode) ?? {
          quantity: 0,
          expiresAt: row.batch.expiryDate?.toISOString(),
        };
        batchEntry.quantity += Number(row.quantity ?? 0);
        batches.set(row.batch.batchCode, batchEntry);
      }
    });

    const movements = await this.prisma.movementLine.findMany({
      where: { tenantId, productId } as any,
      include: {
        movementHeader: { include: { reason: true } },
        fromLocation: true,
        toLocation: true,
        product: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      batches: Array.from(batches.entries()).map(([batch, entry]) => ({
        batch,
        quantity: entry.quantity,
        expiresAt: entry.expiresAt,
      })),
      byLocation: Array.from(byLocation.entries()).map(([location, quantity]) => ({ location, quantity })),
      recentMovements: movements.map((movement) => ({
        id: movement.id,
        type: this.mapMovementType(movement.movementHeader?.movementType),
        productId: movement.productId,
        sku: movement.product?.sku ?? movement.productId,
        productName: movement.product?.name,
        quantity: Number(movement.quantity ?? 0),
        fromLocation: movement.fromLocation?.code,
        toLocation: movement.toLocation?.code,
        user: movement.movementHeader?.createdBy ?? undefined,
        createdAt: movement.createdAt,
        reason: movement.movementHeader?.reason?.label ?? movement.movementHeader?.reference ?? undefined,
        notes: movement.movementHeader?.notes ?? undefined,
      })),
    };
  }

  async listLowStock() {
    const tenantId = this.tenantContext.getTenantId();
    const aggregates = await this.prisma.inventory.groupBy({
      by: ['productId'],
      where: { tenantId, stockStatus: StockStatus.AVAILABLE },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'asc' } },
      take: 50,
    });

    if (!aggregates.length) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: aggregates.map((item) => item.productId) } },
      select: { id: true, sku: true, name: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const minThreshold = 10;
    return aggregates
      .map((item) => {
        const product = productMap.get(item.productId);
        const available = Number(item._sum.quantity ?? 0);
        if (available >= minThreshold) {
          return null;
        }
        const ratio = available / minThreshold;
        const priority = ratio <= 0.3 ? 'HIGH' : ratio <= 0.6 ? 'MEDIUM' : 'LOW';
        return {
          sku: product?.sku ?? item.productId,
          productName: product?.name ?? undefined,
          available,
          min: minThreshold,
          priority,
        };
      })
      .filter(Boolean);
  }

  private mapMovementType(type?: MovementType | null) {
    if (!type) return 'MANUAL';
    switch (type) {
      case MovementType.INTERNAL_TRANSFER:
        return 'INTERNAL_TRANSFER';
      case MovementType.OUTBOUND_SHIPMENT:
        return 'REPLENISHMENT';
      case MovementType.INBOUND_RECEIPT:
        return 'MANUAL';
      case MovementType.ADJUSTMENT:
        return 'MANUAL';
      default:
        return 'MANUAL';
    }
  }
}
