export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  PICKING = 'PICKING',
  IN_TRANSIT_INTERNAL = 'IN_TRANSIT_INTERNAL',
  QUARANTINE = 'QUARANTINE',
  SCRAP = 'SCRAP',
  BLOCKED = 'BLOCKED',
}

export enum OutboundOrderStatus {
  DRAFT = 'DRAFT',
  RELEASED = 'RELEASED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED = 'FULLY_ALLOCATED',
  PICKING = 'PICKING',
  PARTIALLY_PICKED = 'PARTIALLY_PICKED',
  PICKED = 'PICKED',
  CANCELLED = 'CANCELLED',
}

export enum PickingTaskStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum HandlingUnitType {
  BOX = 'BOX',
  PALLET = 'PALLET',
  PARCEL = 'PARCEL',
  CONTAINER = 'CONTAINER',
  OTHER = 'OTHER',
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
  CANCELLED = 'CANCELLED',
}

export enum MovementType {
  INBOUND_RECEIPT = 'INBOUND_RECEIPT',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  OUTBOUND_SHIPMENT = 'OUTBOUND_SHIPMENT',
}

export enum CompatibilityType {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
}

export enum ReplenishmentMethod {
  FIXED = 'FIXED',
  MIN_MAX = 'MIN_MAX',
  EOQ = 'EOQ',
  DOS = 'DOS',
}

export enum ReplenishmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
}

export enum SlottingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
}

export enum TransferOrderStatus {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
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
  CANCELLED = 'CANCELLED',
}

export enum InboundReceiptStatus {
  DRAFT = 'DRAFT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum PickingMethodType {
  ORDER = 'ORDER',
  WAVE = 'WAVE',
  BATCH = 'BATCH',
  ZONE = 'ZONE',
}

export enum WavePickingStrategy {
  BY_ROUTE = 'BY_ROUTE',
  BY_CARRIER = 'BY_CARRIER',
  BY_ZONE = 'BY_ZONE',
  BY_TIMEWINDOW = 'BY_TIMEWINDOW',
  BY_PRIORITY = 'BY_PRIORITY',
}

export enum WaveStatus {
  CREATED = 'CREATED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PermissionResource {
  CONFIG = 'CONFIG',
  INVENTORY = 'INVENTORY',
}

export enum PermissionAction {
  CONFIG = 'CONFIG',
  UPDATE = 'UPDATE',
  READ = 'READ',
}

export enum ZoneType {
  RECEIVING = 'RECEIVING',
  PICKING = 'PICKING',
  RESERVE = 'RESERVE',
  QUARANTINE = 'QUARANTINE',
  SHIPPING = 'SHIPPING',
  RETURNS = 'RETURNS',
  SCRAP = 'SCRAP',
  OTHER = 'OTHER',
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

  mul(input: any) {
    return new Decimal(this.value * this.asNumber(input));
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
  tenantConfig: any;
  pickingMethodConfig: any;
  warehouseZoneConfig: any;
  inventoryPolicy: any;
  outboundRule: any;
  $transaction: any;

  constructor() {
    this.$transaction = jest.fn();
  }

  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }
}
