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
