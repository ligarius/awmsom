import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  HandlingUnitType,
  MovementStatus,
  MovementType,
  OutboundOrderStatus,
  PickingTaskStatus,
  Prisma,
  ShipmentStatus,
  StockStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { CreatePickingTaskDto } from './dto/create-picking-task.dto';
import { ConfirmPickingDto } from './dto/confirm-picking.dto';
import { GetOutboundOrdersFilterDto } from './dto/get-outbound-orders-filter.dto';
import { GetPickingTasksFilterDto } from './dto/get-picking-tasks-filter.dto';
import { CreateHandlingUnitDto } from './dto/create-handling-unit.dto';
import { AddItemsToHandlingUnitDto } from './dto/add-items-to-handling-unit.dto';
import { GetHandlingUnitsFilterDto } from './dto/get-handling-units-filter.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AssignHandlingUnitsToShipmentDto } from './dto/assign-handling-units-to-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { GetShipmentsFilterDto } from './dto/get-shipments-filter.dto';

@Injectable()
export class OutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createOutboundOrder(dto: CreateOutboundOrderDto) {
    const tenantId = this.tenantContext.getTenantId();

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId } as any });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (!dto.lines?.length) {
      throw new BadRequestException('At least one line is required');
    }

    for (const line of dto.lines) {
      const product = await this.prisma.product.findFirst({ where: { id: line.productId, tenantId } as any });
      if (!product) {
        throw new BadRequestException('Product not found');
      }
    }

    return this.prisma.outboundOrder.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        externalRef: dto.externalRef,
        customerRef: dto.customerRef,
        requestedShipDate: dto.requestedShipDate ? new Date(dto.requestedShipDate) : undefined,
        status: OutboundOrderStatus.DRAFT,
        lines: {
          createMany: {
            data: dto.lines.map((line) => ({
              tenantId,
              productId: line.productId,
              requestedQty: new Prisma.Decimal(line.requestedQty),
              uom: line.uom,
            })),
          },
        },
      } as any,
      include: { lines: true },
    });
  }

  async listOutboundOrders(filters: GetOutboundOrdersFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.OutboundOrderWhereInput = { tenantId } as any;

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.externalRef) {
      where.externalRef = filters.externalRef;
    }

    if (filters.customerRef) {
      where.customerRef = filters.customerRef;
    }

    if (filters.fromDate || filters.toDate) {
      where.requestedShipDate = {};
      if (filters.fromDate) {
        where.requestedShipDate.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.requestedShipDate.lte = new Date(filters.toDate);
      }
    }

    return this.prisma.outboundOrder.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOutboundOrder(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id, tenantId } as any,
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException('Outbound order not found');
    }

    return order;
  }

  async releaseOutboundOrder(orderId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id: orderId, tenantId } as any,
      include: { lines: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Outbound order not found');
    }

    if (order.status !== OutboundOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft orders can be released');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: { status: OutboundOrderStatus.RELEASED },
      });

      for (const line of order.lines) {
        let remaining = new Prisma.Decimal(line.requestedQty).minus(line.allocatedQty ?? 0);
        let allocated = new Prisma.Decimal(line.allocatedQty ?? 0);

        if (remaining.lte(0)) {
          continue;
        }

        const inventoryRecords = await tx.inventory.findMany({
          where: {
            productId: line.productId,
            tenantId,
            stockStatus: StockStatus.AVAILABLE,
            location: { warehouseId: order.warehouseId, tenantId } as any,
          } as any,
          include: { batch: true },
          orderBy: line.product.requiresExpiryDate
            ? [{ batch: { expiryDate: 'asc' } }, { createdAt: 'asc' }]
            : [{ createdAt: 'asc' }],
        });

        for (const inventory of inventoryRecords) {
          if (remaining.lte(0)) {
            break;
          }
          const availableQty = new Prisma.Decimal(inventory.quantity);
          if (availableQty.lte(0)) {
            continue;
          }

          const allocateQty = availableQty.lt(remaining) ? availableQty : remaining;
          const updatedAvailable = availableQty.minus(allocateQty);
          await tx.inventory.update({
            where: { id: inventory.id, tenantId } as any,
            data: { quantity: updatedAvailable },
          });

          const reserved = await tx.inventory.findFirst({
            where: {
              productId: inventory.productId,
              batchId: inventory.batchId,
              locationId: inventory.locationId,
              tenantId,
              stockStatus: StockStatus.RESERVED,
              uom: inventory.uom,
            } as any,
          });

          if (reserved) {
            await tx.inventory.update({
              where: { id: reserved.id, tenantId } as any,
              data: { quantity: new Prisma.Decimal(reserved.quantity).plus(allocateQty) },
            });
          } else {
            await tx.inventory.create({
              data: {
                tenantId,
                productId: inventory.productId,
                batchId: inventory.batchId,
                locationId: inventory.locationId,
                stockStatus: StockStatus.RESERVED,
                quantity: allocateQty,
                uom: inventory.uom,
              } as any,
            });
          }

          allocated = allocated.plus(allocateQty);
          remaining = remaining.minus(allocateQty);
        }

        await tx.outboundOrderLine.update({
          where: { id: line.id, tenantId } as any,
          data: { allocatedQty: allocated },
        });
      }

      const updatedLines = await tx.outboundOrderLine.findMany({ where: { outboundOrderId: orderId, tenantId } as any });
      const allAllocated = updatedLines.every((line) => new Prisma.Decimal(line.allocatedQty).eq(line.requestedQty));
      const anyAllocated = updatedLines.some((line) => new Prisma.Decimal(line.allocatedQty).gt(0));

      const newStatus = allAllocated
        ? OutboundOrderStatus.FULLY_ALLOCATED
        : anyAllocated
          ? OutboundOrderStatus.PARTIALLY_ALLOCATED
          : OutboundOrderStatus.RELEASED;

      return tx.outboundOrder.update({
        where: { id: orderId, tenantId } as any,
        data: { status: newStatus },
        include: { lines: true },
      });
    });
  }

  async createPickingTask(orderId: string, dto?: CreatePickingTaskDto) {
    const tenantId = this.tenantContext.getTenantId();
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id: orderId, tenantId } as any,
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException('Outbound order not found');
    }

    if (
      !([OutboundOrderStatus.FULLY_ALLOCATED, OutboundOrderStatus.PARTIALLY_ALLOCATED] as OutboundOrderStatus[]).includes(
        order.status,
      )
    ) {
      throw new BadRequestException('Order must be allocated to create picking task');
    }

    return this.prisma.$transaction(async (tx) => {
      const pickingTask = await tx.pickingTask.create({
        data: {
          tenantId,
          warehouseId: order.warehouseId,
          outboundOrderId: orderId,
          status: dto?.pickerId ? PickingTaskStatus.ASSIGNED : PickingTaskStatus.CREATED,
          pickerId: dto?.pickerId,
        } as any,
      });

      for (const line of order.lines) {
        const reservations = await tx.inventory.findMany({
          where: {
            productId: line.productId,
            tenantId,
            stockStatus: StockStatus.RESERVED,
            location: { warehouseId: order.warehouseId, tenantId } as any,
          } as any,
          include: { batch: true },
        });

        for (const reservation of reservations) {
          if (new Prisma.Decimal(reservation.quantity).lte(0)) {
            continue;
          }

          await tx.pickingTaskLine.create({
            data: {
              tenantId,
              pickingTaskId: pickingTask.id,
              outboundOrderLineId: line.id,
              productId: reservation.productId,
              batchId: reservation.batchId,
              fromLocationId: reservation.locationId,
              quantityToPick: new Prisma.Decimal(reservation.quantity),
              uom: reservation.uom,
            } as any,
          });
        }
      }

      await tx.outboundOrder.update({
        where: { id: orderId, tenantId } as any,
        data: { status: OutboundOrderStatus.PICKING },
      });

      const createdTask = await tx.pickingTask.findFirst({
        where: { id: pickingTask.id, tenantId } as any,
        include: { lines: true },
      });

      if (!createdTask) {
        throw new NotFoundException('Picking task not found after creation');
      }

      return createdTask;
    });
  }

  async startPickingTask(taskId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.pickingTask.findFirst({ where: { id: taskId, tenantId } as any });
    if (!task) {
      throw new NotFoundException('Picking task not found');
    }

    if (!([PickingTaskStatus.CREATED, PickingTaskStatus.ASSIGNED] as PickingTaskStatus[]).includes(task.status)) {
      throw new BadRequestException('Picking task cannot be started');
    }

    return this.prisma.pickingTask.update({
      where: { id: taskId, tenantId } as any,
      data: { status: PickingTaskStatus.IN_PROGRESS, startedAt: new Date() },
    });
  }

  async confirmPickingTask(taskId: string, dto: ConfirmPickingDto) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.pickingTask.findFirst({
      where: { id: taskId, tenantId } as any,
      include: { lines: true, outboundOrder: { include: { lines: true } } },
    });

    if (!task) {
      throw new NotFoundException('Picking task not found');
    }

    if (task.status !== PickingTaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Picking task must be in progress');
    }

    return this.prisma.$transaction(async (tx) => {
      const movementHeader = await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.OUTBOUND_SHIPMENT,
          warehouseId: task.warehouseId,
          status: MovementStatus.COMPLETED,
          reference: task.outboundOrderId,
        } as any,
      });

      for (const dtoLine of dto.lines) {
        const taskLine = task.lines.find((line) => line.id === dtoLine.pickingTaskLineId);
        if (!taskLine) {
          throw new NotFoundException('Picking task line not found');
        }

        const currentPicked = new Prisma.Decimal(taskLine.quantityPicked);
        const toPick = new Prisma.Decimal(taskLine.quantityToPick);
        const qtyPicked = new Prisma.Decimal(dtoLine.quantityPicked);

        if (qtyPicked.gt(toPick.minus(currentPicked))) {
          throw new BadRequestException('Cannot pick more than reserved');
        }

        const reservation = await tx.inventory.findFirst({
          where: {
            productId: taskLine.productId,
            batchId: taskLine.batchId,
            locationId: taskLine.fromLocationId,
            tenantId,
            stockStatus: StockStatus.RESERVED,
            uom: taskLine.uom,
          } as any,
        });

        if (!reservation) {
          throw new BadRequestException('Reserved stock not found for picking');
        }

        const reservationQty = new Prisma.Decimal(reservation.quantity);
        if (reservationQty.lt(qtyPicked)) {
          throw new BadRequestException('Not enough reserved stock');
        }

        await tx.inventory.update({
          where: { id: reservation.id, tenantId } as any,
          data: { quantity: reservationQty.minus(qtyPicked) },
        });

        await tx.pickingTaskLine.update({
          where: { id: taskLine.id, tenantId } as any,
          data: { quantityPicked: currentPicked.plus(qtyPicked) },
        });

        await tx.outboundOrderLine.update({
          where: { id: taskLine.outboundOrderLineId, tenantId } as any,
          data: { pickedQty: new Prisma.Decimal(taskLine.quantityPicked).plus(qtyPicked) },
        });

        await tx.movementLine.create({
          data: {
            tenantId,
            movementHeaderId: movementHeader.id,
            productId: taskLine.productId,
            batchId: taskLine.batchId,
            fromLocationId: taskLine.fromLocationId,
            toLocationId: null,
            quantity: qtyPicked,
            uom: taskLine.uom,
          } as any,
        });
      }

      const updatedLines = await tx.pickingTaskLine.findMany({
        where: { pickingTaskId: taskId, tenantId } as any,
      });
      const allPicked = updatedLines.every((line) => new Prisma.Decimal(line.quantityPicked).eq(line.quantityToPick));

      const updatedTask = await tx.pickingTask.update({
        where: { id: taskId, tenantId } as any,
        data: {
          status: allPicked ? PickingTaskStatus.COMPLETED : task.status,
          completedAt: allPicked ? new Date() : undefined,
        },
        include: { outboundOrder: { include: { lines: true } }, lines: true },
      });

      const orderLines = await tx.outboundOrderLine.findMany({
        where: { outboundOrderId: task.outboundOrderId, tenantId } as any,
      });
      const allOrderPicked = orderLines.every((line) => new Prisma.Decimal(line.pickedQty).eq(line.requestedQty));
      const anyPicked = orderLines.some((line) => new Prisma.Decimal(line.pickedQty).gt(0));

      const newOrderStatus = allOrderPicked
        ? OutboundOrderStatus.PICKED
        : anyPicked
          ? OutboundOrderStatus.PARTIALLY_PICKED
          : task.outboundOrder.status;

      await tx.outboundOrder.update({
        where: { id: task.outboundOrderId, tenantId } as any,
        data: { status: newOrderStatus },
      });

      return updatedTask;
    });
  }

  async listPickingTasks(filters: GetPickingTasksFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.PickingTaskWhereInput = { tenantId } as any;

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.pickerId) {
      where.pickerId = filters.pickerId;
    }

    return this.prisma.pickingTask.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPickingTask(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const task = await this.prisma.pickingTask.findFirst({
      where: { id, tenantId } as any,
      include: { lines: true, outboundOrder: true },
    });

    if (!task) {
      throw new NotFoundException('Picking task not found');
    }

    return task;
  }

  private generateHandlingUnitCode(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
      .getDate()
      .toString()
      .padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `HU-${stamp}-${random}`;
  }

  async createHandlingUnit(dto: CreateHandlingUnitDto) {
    const tenantId = this.tenantContext.getTenantId();
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId } as any });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const code = dto.code ?? this.generateHandlingUnitCode();

    return this.prisma.handlingUnit.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        handlingUnitType: dto.handlingUnitType ?? HandlingUnitType.BOX,
        code,
        externalLabel: dto.externalLabel,
        grossWeight: dto.grossWeight !== undefined ? new Prisma.Decimal(dto.grossWeight) : undefined,
        volume: dto.volume !== undefined ? new Prisma.Decimal(dto.volume) : undefined,
        length: dto.length !== undefined ? new Prisma.Decimal(dto.length) : undefined,
        width: dto.width !== undefined ? new Prisma.Decimal(dto.width) : undefined,
        height: dto.height !== undefined ? new Prisma.Decimal(dto.height) : undefined,
      } as any,
    });
  }

  async addItemsToHandlingUnit(handlingUnitId: string, dto: AddItemsToHandlingUnitDto) {
    const tenantId = this.tenantContext.getTenantId();
    const handlingUnit = await this.prisma.handlingUnit.findFirst({
      where: { id: handlingUnitId, tenantId } as any,
    });

    if (!handlingUnit) {
      throw new NotFoundException('Handling unit not found');
    }

    const order = await this.prisma.outboundOrder.findFirst({
      where: { id: dto.outboundOrderId, tenantId } as any,
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException('Outbound order not found');
    }

    if (order.warehouseId !== handlingUnit.warehouseId) {
      throw new BadRequestException('Handling unit and order must belong to the same warehouse');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const orderLine = order.lines.find((line) => line.id === item.outboundOrderLineId);
        if (!orderLine) {
          throw new BadRequestException('Outbound order line not found in order');
        }

        if (orderLine.productId !== item.productId) {
          throw new BadRequestException('Product mismatch for order line');
        }

        const existing = await tx.handlingUnitLine.aggregate({
          where: { outboundOrderLineId: item.outboundOrderLineId, tenantId } as any,
          _sum: { quantity: true },
        });

        const alreadyPacked = new Prisma.Decimal(existing._sum.quantity ?? 0);
        const pickedQty = new Prisma.Decimal(orderLine.pickedQty ?? 0);
        const requestedQty = new Prisma.Decimal(item.quantity);

        if (requestedQty.lte(0)) {
          throw new BadRequestException('Quantity must be greater than zero');
        }

        if (alreadyPacked.plus(requestedQty).gt(pickedQty)) {
          throw new BadRequestException('Cannot pack more than picked quantity');
        }

        await tx.handlingUnitLine.create({
          data: {
            tenantId,
            handlingUnitId: handlingUnit.id,
            outboundOrderId: dto.outboundOrderId,
            outboundOrderLineId: item.outboundOrderLineId,
            productId: item.productId,
            batchId: item.batchId,
            quantity: requestedQty,
            uom: item.uom,
          } as any,
        });
      }

      const refreshed = await tx.handlingUnit.findFirst({
        where: { id: handlingUnit.id, tenantId } as any,
        include: { lines: true },
      });

      return refreshed ?? handlingUnit;
    });
  }

  async listHandlingUnits(filters: GetHandlingUnitsFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.HandlingUnitWhereInput = { tenantId } as any;

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.code) {
      where.code = filters.code;
    }

    if (filters.handlingUnitType) {
      where.handlingUnitType = filters.handlingUnitType;
    }

    if (filters.outboundOrderId) {
      where.lines = { some: { outboundOrderId: filters.outboundOrderId } };
    }

    return this.prisma.handlingUnit.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHandlingUnit(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const hu = await this.prisma.handlingUnit.findFirst({
      where: { id, tenantId } as any,
      include: { lines: true },
    });

    if (!hu) {
      throw new NotFoundException('Handling unit not found');
    }

    return hu;
  }

  async createShipment(dto: CreateShipmentDto) {
    const tenantId = this.tenantContext.getTenantId();
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId } as any });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.prisma.shipment.create({
      data: {
        tenantId,
        warehouseId: dto.warehouseId,
        carrierRef: dto.carrierRef,
        vehicleRef: dto.vehicleRef,
        routeRef: dto.routeRef,
        status: ShipmentStatus.PLANNED,
        scheduledDeparture: dto.scheduledDeparture ? new Date(dto.scheduledDeparture) : undefined,
      } as any,
    });
  }

  async assignHandlingUnitsToShipment(shipmentId: string, dto: AssignHandlingUnitsToShipmentDto) {
    const tenantId = this.tenantContext.getTenantId();
    const shipment = await this.prisma.shipment.findFirst({ where: { id: shipmentId, tenantId } as any });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (([ShipmentStatus.CANCELLED, ShipmentStatus.DISPATCHED] as ShipmentStatus[]).includes(shipment.status as any)) {
      throw new BadRequestException('Shipment cannot be modified in its current status');
    }

    const handlingUnits = (await this.prisma.handlingUnit.findMany({
      where: { id: { in: dto.handlingUnitIds }, tenantId } as any,
      include: { lines: true },
    })) as any[];

    if (handlingUnits.length !== dto.handlingUnitIds.length) {
      throw new NotFoundException('One or more handling units not found');
    }

    if (handlingUnits.some((hu) => hu.warehouseId !== shipment.warehouseId)) {
      throw new BadRequestException('Handling units and shipment must belong to the same warehouse');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingLinks = (await tx.shipmentHandlingUnit.findMany({
        where: { shipmentId, tenantId } as any,
      })) as any[];
      const existingKey = new Set(
        existingLinks.map((link) => `${link.handlingUnitId}-${link.outboundOrderId}`),
      );

      for (const hu of handlingUnits) {
        const distinctOrders = Array.from(
          new Set((hu.lines as any[]).map((line) => line.outboundOrderId)),
        );
        if (!distinctOrders.length) {
          throw new BadRequestException('Handling unit must contain lines before assignment');
        }

        for (const orderId of distinctOrders) {
          const key = `${hu.id}-${orderId}`;
          if (existingKey.has(key)) {
            continue;
          }

          await tx.shipmentHandlingUnit.create({
            data: {
              tenantId,
              shipmentId,
              handlingUnitId: hu.id,
              outboundOrderId: orderId,
            } as any,
          });
        }
      }

      const newStatus = shipment.status === ShipmentStatus.PLANNED ? ShipmentStatus.LOADING : shipment.status;

      return tx.shipment.update({
        where: { id: shipmentId, tenantId } as any,
        data: { status: newStatus },
        include: { shipmentHandlingUnits: true },
      });
    });
  }

  async dispatchShipment(shipmentId: string, dto: DispatchShipmentDto) {
    const tenantId = this.tenantContext.getTenantId();
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId } as any,
      include: { shipmentHandlingUnits: true },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (!([ShipmentStatus.PLANNED, ShipmentStatus.LOADING] as ShipmentStatus[]).includes(shipment.status as any)) {
      throw new BadRequestException('Shipment cannot be dispatched from its current status');
    }

    if (!shipment.shipmentHandlingUnits.length) {
      throw new BadRequestException('Shipment must have handling units assigned');
    }

    return this.prisma.$transaction(async (tx) => {
      const handlingUnits = await tx.handlingUnit.findMany({
        where: { shipments: { some: { shipmentId, tenantId } }, tenantId } as any,
        include: { lines: true },
      });

      // Inventory quantities were reduced during picking confirmation; dispatch logs the physical exit for traceability.
      const movementHeader = await tx.movementHeader.create({
        data: {
          tenantId,
          movementType: MovementType.OUTBOUND_SHIPMENT,
          warehouseId: shipment.warehouseId,
          status: MovementStatus.COMPLETED,
          reference: shipment.id,
        } as any,
      });

      for (const hu of handlingUnits) {
        for (const line of hu.lines) {
          await tx.movementLine.create({
            data: {
              tenantId,
              movementHeaderId: movementHeader.id,
              productId: line.productId,
              batchId: line.batchId,
              fromLocationId: null,
              toLocationId: null,
              quantity: new Prisma.Decimal(line.quantity),
              uom: line.uom,
            } as any,
          });
        }
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId, tenantId } as any,
        data: {
          status: ShipmentStatus.DISPATCHED,
          actualDeparture: dto.actualDeparture ? new Date(dto.actualDeparture) : new Date(),
        },
        include: { shipmentHandlingUnits: true },
      });

      return updatedShipment;
    });
  }

  async listShipments(filters: GetShipmentsFilterDto) {
    const tenantId = this.tenantContext.getTenantId();
    const where: Prisma.ShipmentWhereInput = { tenantId } as any;

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.carrierRef) {
      where.carrierRef = filters.carrierRef;
    }

    if (filters.vehicleRef) {
      where.vehicleRef = filters.vehicleRef;
    }

    if (filters.fromDate || filters.toDate) {
      where.scheduledDeparture = {};
      if (filters.fromDate) {
        where.scheduledDeparture.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.scheduledDeparture.lte = new Date(filters.toDate);
      }
    }

    return this.prisma.shipment.findMany({
      where,
      include: { shipmentHandlingUnits: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShipment(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, tenantId } as any,
      include: {
        shipmentHandlingUnits: {
          include: {
            handlingUnit: { include: { lines: true } },
            outboundOrder: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }
}
