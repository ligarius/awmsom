export type InboundStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED";

export interface InboundLine {
  id: string;
  productId: string;
  productSku: string;
  productName?: string;
  expectedQty: number;
  receivedQty?: number;
  uom?: string;
  isBatchManaged?: boolean;
  batchNumber?: string | null;
}

export interface InboundDocument {
  id: string;
  code: string;
  supplier: string;
  warehouseId: string;
  warehouseName?: string;
  expectedDate?: string;
  status: InboundStatus;
  lines: InboundLine[];
  createdAt?: string;
}

export interface InventorySummary {
  productId: string;
  sku: string;
  name: string;
  totalUnits: number;
  totalUom?: string;
  batchCount?: number;
  locationCount?: number;
}

export interface InventoryByLocation {
  locationId: string;
  locationCode: string;
  productId: string;
  sku: string;
  productName?: string;
  quantity: number;
  batch?: string | null;
  updatedAt?: string;
}

export interface InventoryByBatch {
  batch: string;
  productId: string;
  sku: string;
  productName?: string;
  quantity: number;
  expiresAt?: string;
  warehouseName?: string;
  locationCode?: string;
}

export interface ProductInventoryDetail {
  productId: string;
  sku: string;
  name: string;
  batches: { batch: string; quantity: number; expiresAt?: string }[];
  byLocation: { location: string; quantity: number }[];
  recentMovements: Movement[];
}

export type OutboundStatus = "CREATED" | "RELEASED" | "PICKING" | "PACKED" | "SHIPPED";

export interface OutboundLine {
  id: string;
  productId: string;
  productSku: string;
  productName?: string;
  quantity: number;
  pickedQuantity?: number;
  uom?: string;
  locationCode?: string;
  batchRequired?: boolean;
}

export interface OutboundOrder {
  id: string;
  code: string;
  client: string;
  warehouseId?: string;
  warehouseName?: string;
  commitmentDate?: string;
  status: OutboundStatus;
  lines: OutboundLine[];
  pickerId?: string | null;
  pickerName?: string | null;
  waveId?: string | null;
  totalLines?: number;
  createdAt?: string;
}

export type PickingTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";

export interface PickingTask {
  id: string;
  code: string;
  productId: string;
  productSku: string;
  productName?: string;
  quantity: number;
  uom?: string;
  locationId?: string;
  locationCode?: string;
  status: PickingTaskStatus;
  waveId?: string;
  orderCode?: string;
  batch?: string | null;
}

export type WaveStatus = "CREATED" | "PLANNED" | "RELEASED" | "PICKING" | "DONE";

export interface Wave {
  id: string;
  code: string;
  status: WaveStatus;
  orders: OutboundOrder[];
  pickerId?: string | null;
  pickerName?: string | null;
  warehouseId?: string;
  warehouseName?: string;
  ordersCount?: number;
  skuCount?: number;
  totalLines?: number;
}

export interface PickingPathStop {
  sequence: number;
  aisle?: string;
  rack?: string;
  level?: string;
  locationCode: string;
  productSku: string;
  productName?: string;
  quantity: number;
}

export interface PickingPathPlan {
  waveId: string;
  totalDistance: number;
  estimatedTimeMinutes: number;
  stops: PickingPathStop[];
}

export type HandlingUnitType = "BOX" | "PALLET" | "PARCEL" | "CONTAINER" | "OTHER";

export interface HandlingUnitLine {
  id: string;
  outboundOrderId: string;
  outboundOrderLineId: string;
  productId: string;
  productSku?: string;
  productName?: string;
  batchId?: string | null;
  quantity: number;
  uom: string;
}

export interface HandlingUnit {
  id: string;
  code: string;
  warehouseId: string;
  handlingUnitType: HandlingUnitType;
  externalLabel?: string | null;
  grossWeight?: number | null;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string;
  lines: HandlingUnitLine[];
}

export interface ShipmentHandlingUnit {
  id: string;
  shipmentId: string;
  handlingUnitId: string;
  outboundOrderId: string;
  handlingUnit?: HandlingUnit;
  outboundOrder?: { id: string; code?: string; client?: string };
}

export type ShipmentStatus = "PLANNED" | "LOADING" | "DISPATCHED";

export interface Shipment {
  id: string;
  warehouseId: string;
  status: ShipmentStatus;
  carrierRef?: string | null;
  vehicleRef?: string | null;
  routeRef?: string | null;
  scheduledDeparture?: string | null;
  actualDeparture?: string | null;
  shipmentHandlingUnits?: ShipmentHandlingUnit[];
}

export type MovementType = "MANUAL" | "RESLOTTING" | "REPLENISHMENT";

export interface Movement {
  id: string;
  type: MovementType;
  productId: string;
  sku: string;
  productName?: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  user?: string;
  createdAt?: string;
  reason?: string;
}

export type AdjustmentType = "AUMENTO" | "DISMINUCION";

export interface Adjustment {
  id: string;
  code: string;
  type: AdjustmentType;
  productId: string;
  sku: string;
  productName?: string;
  quantity: number;
  batch?: string | null;
  locationCode?: string;
  reason: string;
  comment?: string;
  user?: string;
  createdAt?: string;
}

export type CycleCountStatus = "PENDING" | "ASSIGNED" | "COUNTING" | "REVIEW" | "CLOSED";

export interface CycleCountTaskLine {
  location: string;
  productId: string;
  sku: string;
  productName?: string;
  theoretical: number;
  counted?: number;
}

export interface CycleCountDocument {
  id: string;
  code: string;
  warehouseName?: string;
  zones?: string[];
  assignedTo?: string;
  status: CycleCountStatus;
  createdAt?: string;
  lines: CycleCountTaskLine[];
}
