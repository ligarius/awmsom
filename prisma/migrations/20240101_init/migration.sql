-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('NORMAL', 'BLOCKED', 'RECALL', 'UNDER_INVESTIGATION');

-- CreateEnum
CREATE TYPE "CycleCountStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('GAIN', 'LOSS', 'CORRECTION');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'PICKING', 'IN_TRANSIT_INTERNAL', 'QUARANTINE', 'SCRAP', 'BLOCKED');

-- CreateEnum
CREATE TYPE "InboundReceiptStatus" AS ENUM ('DRAFT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INBOUND_RECEIPT', 'INTERNAL_TRANSFER', 'ADJUSTMENT', 'OUTBOUND_SHIPMENT');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandlingUnitType" AS ENUM ('BOX', 'PALLET', 'PARCEL', 'CONTAINER', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PLANNED', 'LOADING', 'DISPATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundOrderStatus" AS ENUM ('DRAFT', 'RELEASED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'PICKING', 'PARTIALLY_PICKED', 'PICKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickingMethodType" AS ENUM ('ORDER', 'WAVE', 'BATCH', 'ZONE');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('RECEIVING', 'PICKING', 'RESERVE', 'QUARANTINE', 'SHIPPING', 'RETURNS', 'SCRAP', 'OTHER');

-- CreateEnum
CREATE TYPE "PickingTaskStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "zone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresBatch" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "defaultUom" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" "BatchStatus" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "locationId" TEXT NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "externalRef" TEXT,
    "status" "InboundReceiptStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "InboundReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundReceiptLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inboundReceiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQty" DECIMAL(20,4) NOT NULL,
    "receivedQty" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,
    "batchCode" TEXT,
    "expiryDate" TIMESTAMP(3),
    "sourceDocumentLineRef" TEXT,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementHeader" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "reference" TEXT,
    "status" "MovementStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "MovementHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "movementHeaderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" DECIMAL(20,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "batchCode" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "description" TEXT,
    "status" "CycleCountStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CycleCountTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleCountLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cycleCountTaskId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "locationId" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "expectedQty" DECIMAL(20,4) NOT NULL,
    "countedQty" DECIMAL(20,4),
    "differenceQty" DECIMAL(20,4),
    "countedAt" TIMESTAMP(3),
    "countedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "locationId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "movementHeaderId" TEXT,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "previousQty" DECIMAL(20,4) NOT NULL,
    "newQty" DECIMAL(20,4) NOT NULL,
    "differenceQty" DECIMAL(20,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "externalRef" TEXT,
    "customerRef" TEXT,
    "status" "OutboundOrderStatus" NOT NULL,
    "requestedShipDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "OutboundOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundOrderLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outboundOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" DECIMAL(20,4) NOT NULL,
    "allocatedQty" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "pickedQty" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickingTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "outboundOrderId" TEXT NOT NULL,
    "status" "PickingTaskStatus" NOT NULL,
    "pickerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PickingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickingTaskLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pickingTaskId" TEXT NOT NULL,
    "outboundOrderLineId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "fromLocationId" TEXT NOT NULL,
    "quantityToPick" DECIMAL(20,4) NOT NULL,
    "quantityPicked" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickingTaskLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandlingUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "handlingUnitType" "HandlingUnitType" NOT NULL,
    "code" TEXT NOT NULL,
    "externalLabel" TEXT,
    "grossWeight" DECIMAL(20,4),
    "volume" DECIMAL(20,4),
    "length" DECIMAL(20,4),
    "width" DECIMAL(20,4),
    "height" DECIMAL(20,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "HandlingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandlingUnitLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "handlingUnitId" TEXT NOT NULL,
    "outboundOrderId" TEXT NOT NULL,
    "outboundOrderLineId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" DECIMAL(20,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandlingUnitLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "carrierRef" TEXT,
    "vehicleRef" TEXT,
    "routeRef" TEXT,
    "status" "ShipmentStatus" NOT NULL,
    "scheduledDeparture" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentHandlingUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "handlingUnitId" TEXT NOT NULL,
    "outboundOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentHandlingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultUom" TEXT,
    "defaultStockStatus" TEXT,
    "defaultBatchPolicy" TEXT,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "enableCycleCounting" BOOLEAN NOT NULL DEFAULT true,
    "cycleCountDefaultFreqDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickingMethodConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "method" "PickingMethodType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickingMethodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseZoneConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneType" "ZoneType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowInbound" BOOLEAN NOT NULL DEFAULT false,
    "allowPicking" BOOLEAN NOT NULL DEFAULT false,
    "allowStorage" BOOLEAN NOT NULL DEFAULT false,
    "allowReturns" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseZoneConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "productId" TEXT,
    "maxOverReceiptPct" DOUBLE PRECISION,
    "maxUnderReceiptPct" DOUBLE PRECISION,
    "cycleCountFreqDays" INTEGER,
    "maxInventoryVariance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "allowPartialShipments" BOOLEAN NOT NULL DEFAULT true,
    "enforceFullAllocation" BOOLEAN NOT NULL DEFAULT false,
    "defaultPickingMethod" "PickingMethodType",
    "defaultShipmentStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_tenantId_code_key" ON "Warehouse"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE INDEX "Location_code_idx" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_warehouseId_code_key" ON "Location"("warehouseId", "code");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "Batch_productId_batchCode_idx" ON "Batch"("productId", "batchCode");

-- CreateIndex
CREATE INDEX "Batch_tenantId_idx" ON "Batch"("tenantId");

-- CreateIndex
CREATE INDEX "Inventory_productId_batchId_locationId_idx" ON "Inventory"("productId", "batchId", "locationId");

-- CreateIndex
CREATE INDEX "Inventory_tenantId_idx" ON "Inventory"("tenantId");

-- CreateIndex
CREATE INDEX "InboundReceipt_warehouseId_status_idx" ON "InboundReceipt"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "InboundReceipt_tenantId_idx" ON "InboundReceipt"("tenantId");

-- CreateIndex
CREATE INDEX "InboundReceiptLine_inboundReceiptId_productId_idx" ON "InboundReceiptLine"("inboundReceiptId", "productId");

-- CreateIndex
CREATE INDEX "InboundReceiptLine_tenantId_idx" ON "InboundReceiptLine"("tenantId");

-- CreateIndex
CREATE INDEX "MovementHeader_movementType_warehouseId_status_idx" ON "MovementHeader"("movementType", "warehouseId", "status");

-- CreateIndex
CREATE INDEX "MovementHeader_tenantId_idx" ON "MovementHeader"("tenantId");

-- CreateIndex
CREATE INDEX "MovementLine_movementHeaderId_productId_batchId_idx" ON "MovementLine"("movementHeaderId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "MovementLine_tenantId_idx" ON "MovementLine"("tenantId");

-- CreateIndex
CREATE INDEX "CycleCountTask_warehouseId_status_idx" ON "CycleCountTask"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "CycleCountTask_tenantId_idx" ON "CycleCountTask"("tenantId");

-- CreateIndex
CREATE INDEX "CycleCountLine_cycleCountTaskId_productId_locationId_idx" ON "CycleCountLine"("cycleCountTaskId", "productId", "locationId");

-- CreateIndex
CREATE INDEX "CycleCountLine_tenantId_idx" ON "CycleCountLine"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_warehouseId_productId_locationId_create_idx" ON "InventoryAdjustment"("warehouseId", "productId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_tenantId_idx" ON "InventoryAdjustment"("tenantId");

-- CreateIndex
CREATE INDEX "OutboundOrder_warehouseId_status_requestedShipDate_idx" ON "OutboundOrder"("warehouseId", "status", "requestedShipDate");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_idx" ON "OutboundOrder"("tenantId");

-- CreateIndex
CREATE INDEX "OutboundOrderLine_outboundOrderId_productId_idx" ON "OutboundOrderLine"("outboundOrderId", "productId");

-- CreateIndex
CREATE INDEX "OutboundOrderLine_tenantId_idx" ON "OutboundOrderLine"("tenantId");

-- CreateIndex
CREATE INDEX "PickingTask_warehouseId_outboundOrderId_status_idx" ON "PickingTask"("warehouseId", "outboundOrderId", "status");

-- CreateIndex
CREATE INDEX "PickingTask_tenantId_idx" ON "PickingTask"("tenantId");

-- CreateIndex
CREATE INDEX "PickingTaskLine_pickingTaskId_productId_batchId_fromLocatio_idx" ON "PickingTaskLine"("pickingTaskId", "productId", "batchId", "fromLocationId");

-- CreateIndex
CREATE INDEX "PickingTaskLine_tenantId_idx" ON "PickingTaskLine"("tenantId");

-- CreateIndex
CREATE INDEX "HandlingUnit_warehouseId_code_idx" ON "HandlingUnit"("warehouseId", "code");

-- CreateIndex
CREATE INDEX "HandlingUnit_tenantId_idx" ON "HandlingUnit"("tenantId");

-- CreateIndex
CREATE INDEX "HandlingUnitLine_handlingUnitId_outboundOrderId_productId_b_idx" ON "HandlingUnitLine"("handlingUnitId", "outboundOrderId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "HandlingUnitLine_tenantId_idx" ON "HandlingUnitLine"("tenantId");

-- CreateIndex
CREATE INDEX "Shipment_warehouseId_status_scheduledDeparture_idx" ON "Shipment"("warehouseId", "status", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_idx" ON "Shipment"("tenantId");

-- CreateIndex
CREATE INDEX "ShipmentHandlingUnit_shipmentId_handlingUnitId_outboundOrde_idx" ON "ShipmentHandlingUnit"("shipmentId", "handlingUnitId", "outboundOrderId");

-- CreateIndex
CREATE INDEX "ShipmentHandlingUnit_tenantId_idx" ON "ShipmentHandlingUnit"("tenantId");

-- CreateIndex
CREATE INDEX "TenantConfig_tenantId_idx" ON "TenantConfig"("tenantId");

-- CreateIndex
CREATE INDEX "PickingMethodConfig_tenantId_idx" ON "PickingMethodConfig"("tenantId");

-- CreateIndex
CREATE INDEX "PickingMethodConfig_tenantId_warehouseId_idx" ON "PickingMethodConfig"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "WarehouseZoneConfig_tenantId_idx" ON "WarehouseZoneConfig"("tenantId");

-- CreateIndex
CREATE INDEX "WarehouseZoneConfig_tenantId_warehouseId_idx" ON "WarehouseZoneConfig"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryPolicy_tenantId_idx" ON "InventoryPolicy"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryPolicy_tenantId_warehouseId_idx" ON "InventoryPolicy"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryPolicy_tenantId_productId_idx" ON "InventoryPolicy"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "OutboundRule_tenantId_idx" ON "OutboundRule"("tenantId");

-- CreateIndex
CREATE INDEX "OutboundRule_tenantId_warehouseId_idx" ON "OutboundRule"("tenantId", "warehouseId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceipt" ADD CONSTRAINT "InboundReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceipt" ADD CONSTRAINT "InboundReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceiptLine" ADD CONSTRAINT "InboundReceiptLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceiptLine" ADD CONSTRAINT "InboundReceiptLine_inboundReceiptId_fkey" FOREIGN KEY ("inboundReceiptId") REFERENCES "InboundReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceiptLine" ADD CONSTRAINT "InboundReceiptLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceiptLine" ADD CONSTRAINT "InboundReceiptLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementHeader" ADD CONSTRAINT "MovementHeader_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementHeader" ADD CONSTRAINT "MovementHeader_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_movementHeaderId_fkey" FOREIGN KEY ("movementHeaderId") REFERENCES "MovementHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLine" ADD CONSTRAINT "MovementLine_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountTask" ADD CONSTRAINT "CycleCountTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountTask" ADD CONSTRAINT "CycleCountTask_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_cycleCountTaskId_fkey" FOREIGN KEY ("cycleCountTaskId") REFERENCES "CycleCountTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleCountLine" ADD CONSTRAINT "CycleCountLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_movementHeaderId_fkey" FOREIGN KEY ("movementHeaderId") REFERENCES "MovementHeader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrderLine" ADD CONSTRAINT "OutboundOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrderLine" ADD CONSTRAINT "OutboundOrderLine_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrderLine" ADD CONSTRAINT "OutboundOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTask" ADD CONSTRAINT "PickingTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTask" ADD CONSTRAINT "PickingTask_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTask" ADD CONSTRAINT "PickingTask_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_pickingTaskId_fkey" FOREIGN KEY ("pickingTaskId") REFERENCES "PickingTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_outboundOrderLineId_fkey" FOREIGN KEY ("outboundOrderLineId") REFERENCES "OutboundOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTaskLine" ADD CONSTRAINT "PickingTaskLine_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_outboundOrderLineId_fkey" FOREIGN KEY ("outboundOrderLineId") REFERENCES "OutboundOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnitLine" ADD CONSTRAINT "HandlingUnitLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_handlingUnitId_fkey" FOREIGN KEY ("handlingUnitId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentHandlingUnit" ADD CONSTRAINT "ShipmentHandlingUnit_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantConfig" ADD CONSTRAINT "TenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingMethodConfig" ADD CONSTRAINT "PickingMethodConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingMethodConfig" ADD CONSTRAINT "PickingMethodConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZoneConfig" ADD CONSTRAINT "WarehouseZoneConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZoneConfig" ADD CONSTRAINT "WarehouseZoneConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPolicy" ADD CONSTRAINT "InventoryPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPolicy" ADD CONSTRAINT "InventoryPolicy_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPolicy" ADD CONSTRAINT "InventoryPolicy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRule" ADD CONSTRAINT "OutboundRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRule" ADD CONSTRAINT "OutboundRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

