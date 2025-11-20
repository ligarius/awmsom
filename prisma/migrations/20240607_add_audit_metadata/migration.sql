ALTER TABLE "User" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "User" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Role" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Role" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Warehouse" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Location" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Location" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Product" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Product" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Batch" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Batch" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "Inventory" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "MovementHeader" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "MovementHeader" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "MovementLine" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "MovementLine" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "InboundReceipt" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "InboundReceipt" ADD COLUMN "updatedBy" TEXT;

ALTER TABLE "InboundReceiptLine" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "InboundReceiptLine" ADD COLUMN "updatedBy" TEXT;
