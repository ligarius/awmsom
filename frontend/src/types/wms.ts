export interface Warehouse {
  id: string;
  name: string;
  code: string;
  country?: string;
  city?: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Zone {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  name: string;
  code: string;
  zoneType: "RECEIVING" | "STORAGE" | "PICKING" | "SHIPPING" | "RETURNS";
  description?: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  warehouseId: string;
  zoneId: string;
  warehouseName?: string;
  zoneName?: string;
  code: string;
  aisle?: string;
  row?: string;
  column?: string;
  level?: string;
  locationType: string;
  capacityUnits?: number;
  capacityWeight?: number;
  capacityVolume?: number;
  isActive: boolean;
}

export interface Uom {
  id: string;
  code: string;
  description?: string;
  type: "UNIT" | "WEIGHT" | "VOLUME";
  baseUomId?: string | null;
  baseUomCode?: string;
  factorToBase?: number;
  isActive: boolean;
}

export interface ProductClass {
  id: string;
  code: string;
  name: string;
  description?: string;
  isFragile?: boolean;
  isHeavy?: boolean;
  isCold?: boolean;
  isHazmat?: boolean;
  isActive: boolean;
}

export interface ProductUom {
  uomId: string;
  factor: number;
  isDefaultPickingUom?: boolean;
  uomCode?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  baseUomId: string;
  baseUomCode?: string;
  alternativeUoms?: ProductUom[];
  productClassId?: string;
  productClassCode?: string;
  weight?: number;
  volume?: number;
  barcode?: string;
  isBatchManaged?: boolean;
  isActive: boolean;
}

export interface OperationSettings {
  defaultWarehouseId?: string;
  defaultReceivingZoneId?: string;
  defaultShippingZoneId?: string;
  defaultPickingStrategy?: string;
  allowOverReceiving?: boolean;
  allowUnderReceiving?: boolean;
  requireBatchInInbound?: boolean;
  requireLocationOnInbound?: boolean;
}
