export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  DAMAGED = 'DAMAGED',
  RESERVED = 'RESERVED',
}

export enum OutboundOrderStatus {
  DRAFT = 'DRAFT',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED = 'FULLY_ALLOCATED',
  SHIPPED = 'SHIPPED',
}

export enum PickingTaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum HandlingUnitType {
  BOX = 'BOX',
  PALLET = 'PALLET',
}

export enum ShipmentStatus {
  PLANNED = 'PLANNED',
  LOADING = 'LOADING',
  DISPATCHED = 'DISPATCHED',
  CANCELLED = 'CANCELLED',
}

export enum MovementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export enum MovementType {
  OUTBOUND_SHIPMENT = 'OUTBOUND_SHIPMENT',
  OUTBOUND = 'OUTBOUND',
}

export enum AdjustmentType {
  GAIN = 'GAIN',
  LOSS = 'LOSS',
  CORRECTION = 'CORRECTION',
}

export enum CycleCountStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum InboundReceiptStatus {
  DRAFT = 'DRAFT',
  RECEIVED = 'RECEIVED',
}

class Decimal {
  value: number;

  constructor(value: any) {
    this.value = this.asNumber(value);
  }

  private asNumber(input: any) {
    if (input instanceof Decimal) {
      return input.value;
    }

    if (input && typeof input === 'object' && 'value' in input) {
      return Number((input as any).value);
    }

    const numeric = Number(input);
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  minus(input: any) {
    return new Decimal(this.value - this.asNumber(input));
  }

  plus(input: any) {
    return new Decimal(this.value + this.asNumber(input));
  }

  lte(input: any) {
    return this.value <= this.asNumber(input);
  }

  lt(input: any) {
    return this.value < this.asNumber(input);
  }

  gt(input: any) {
    return this.value > this.asNumber(input);
  }

  gte(input: any) {
    return this.value >= this.asNumber(input);
  }

  eq(input: any) {
    return this.value === this.asNumber(input);
  }

  isZero() {
    return this.value === 0;
  }

  equals(input: any) {
    return this.eq(input);
  }

  toNumber() {
    return this.value;
  }

  isNeg() {
    return this.value < 0;
  }

  abs() {
    return new Decimal(Math.abs(this.value));
  }
}

export const Prisma = {
  Decimal,
  OutboundOrderWhereInput: class {},
  PickingTaskWhereInput: class {},
  HandlingUnitWhereInput: class {},
  ShipmentWhereInput: class {},
  InventoryMovementWhereInput: class {},
  InboundReceiptWhereInput: class {},
  CycleCountTaskWhereInput: class {},
};

export class PrismaClient {
  warehouse: any;
  product: any;
  outboundOrder: any;
  outboundOrderLine: any;
  inventory: any;
  pickingTask: any;
  pickingTaskLine: any;
  movementHeader: any;
  movementLine: any;
  handlingUnit: any;
  handlingUnitLine: any;
  shipment: any;
  shipmentHandlingUnit: any;
  inboundReceipt: any;
  inboundReceiptLine: any;
  cycleCountTask: any;
  cycleCountLine: any;
  $transaction: any;

  constructor() {
    this.$transaction = jest.fn();
  }
}
