/*
  Warnings:

  - You are about to drop the column `createdBy` on the `InboundReceiptLine` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `InboundReceiptLine` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `MovementHeader` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `MovementLine` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `MovementLine` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Batch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReplenishmentMethod" AS ENUM ('FIXED', 'MIN_MAX', 'EOQ', 'DOS');

-- CreateEnum
CREATE TYPE "ReplenishmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "CompatibilityType" AS ENUM ('ALLOW', 'BLOCK');

-- CreateEnum
CREATE TYPE "SlottingStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransferOrderStatus" AS ENUM ('CREATED', 'APPROVED', 'RELEASED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PermissionResource" AS ENUM ('TENANT_CONFIG', 'WAREHOUSE', 'LOCATION', 'PRODUCT', 'INVENTORY', 'INBOUND', 'OUTBOUND', 'PICKING', 'PACKING', 'SHIPMENT', 'CYCLE_COUNT', 'ADJUSTMENT', 'REPORTS', 'USERS', 'ROLES', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'CONFIG', 'MANAGE');

-- CreateEnum
CREATE TYPE "AccessReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('ERP', 'ECOMMERCE', 'TMS', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "WavePickingStrategy" AS ENUM ('BY_ROUTE', 'BY_CARRIER', 'BY_ZONE', 'BY_TIMEWINDOW', 'BY_PRIORITY');

-- CreateEnum
CREATE TYPE "WaveStatus" AS ENUM ('CREATED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "PickingTask" DROP CONSTRAINT "PickingTask_outboundOrderId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropIndex
DROP INDEX "Role_name_key";

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InboundReceiptLine" DROP COLUMN "createdBy",
DROP COLUMN "updatedBy";

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "aisle" TEXT,
ADD COLUMN     "column" TEXT,
ADD COLUMN     "coordinates" JSONB,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "row" TEXT;

-- AlterTable
ALTER TABLE "MovementHeader" DROP COLUMN "updatedBy";

-- AlterTable
ALTER TABLE "MovementLine" DROP COLUMN "createdBy",
DROP COLUMN "updatedBy";

-- AlterTable
ALTER TABLE "OutboundOrder" ADD COLUMN     "carrierCode" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "priority" INTEGER DEFAULT 0,
ADD COLUMN     "routeCode" TEXT,
ADD COLUMN     "zoneCode" TEXT;

-- AlterTable
ALTER TABLE "PickingTask" ADD COLUMN     "waveId" TEXT,
ALTER COLUMN "outboundOrderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "createdBy",
DROP COLUMN "updatedBy",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "planCode" "PlanCode",
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ALTER COLUMN "plan" SET DEFAULT 'BASIC';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "roleId";

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxWarehouses" INTEGER,
    "maxUsers" INTEGER,
    "maxApiKeys" INTEGER,
    "maxMonthlyOrders" INTEGER,
    "maxMonthlyShipments" INTEGER,
    "maxIntegrations" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "destination" TEXT,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channelHint" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthIdentity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "summary" TEXT,
    "findings" JSONB,
    "orphaned" JSONB,
    "excessive" JSONB,
    "status" "AccessReviewStatus" NOT NULL DEFAULT 'PENDING',
    "responsibleUserId" TEXT,
    "reviewerUserId" TEXT,
    "evidenceUrl" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "lastExportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionReviewSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'quarterly',
    "nextReviewDate" TIMESTAMP(3),
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "lastRunAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionReviewSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "encryptedPayload" TEXT,
    "expiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wave" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "strategy" "WavePickingStrategy" NOT NULL,
    "status" "WaveStatus" NOT NULL DEFAULT 'CREATED',
    "routeCode" TEXT,
    "carrierCode" TEXT,
    "zoneCode" TEXT,
    "timeWindowFrom" TIMESTAMP(3),
    "timeWindowTo" TIMESTAMP(3),
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "pickerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Wave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "outboundOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaveOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WavePickingPath" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "pickerUserId" TEXT,
    "pathJson" JSONB NOT NULL,
    "totalDistance" DECIMAL(65,30),
    "totalTime" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WavePickingPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "username" TEXT,
    "password" TEXT,
    "extraConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT,
    "jobType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "IntegrationJobStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "uom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kpiType" "KpiType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT,
    "fillRate" DECIMAL(65,30),
    "otif" DECIMAL(65,30),
    "inventoryTurnover" DECIMAL(65,30),
    "averageInventoryQty" DECIMAL(65,30),
    "daysOfSupply" DECIMAL(65,30),
    "linesPerHour" DECIMAL(65,30),
    "unitsPerHour" DECIMAL(65,30),
    "pickingAccuracy" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplenishmentPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "method" "ReplenishmentMethod" NOT NULL,
    "fixedQty" INTEGER,
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "safetyStock" INTEGER,
    "eoqQty" INTEGER,
    "daysOfSupply" INTEGER,
    "leadTimeDays" INTEGER,
    "periodicity" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplenishmentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplenishmentSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "suggestedQty" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "ReplenishmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplenishmentSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceWarehouseId" TEXT NOT NULL,
    "destinationWarehouseId" TEXT NOT NULL,
    "status" "TransferOrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferOrderLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "warehousesCount" INTEGER NOT NULL DEFAULT 0,
    "usersCount" INTEGER NOT NULL DEFAULT 0,
    "apiKeysCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyShipmentsCount" INTEGER NOT NULL DEFAULT 0,
    "integrationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlottingConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "abcPeriodDays" INTEGER NOT NULL,
    "xyzPeriodDays" INTEGER NOT NULL,
    "goldenZoneLocations" INTEGER,
    "heavyProductsZone" BOOLEAN NOT NULL DEFAULT true,
    "fragileProductsZone" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlottingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationCompatibilityRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productClass" TEXT,
    "productId" TEXT,
    "ruleType" "CompatibilityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationCompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlottingRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "currentLocationId" TEXT,
    "recommendedLocationId" TEXT NOT NULL,
    "reason" TEXT,
    "score" DECIMAL(20,4) NOT NULL,
    "status" "SlottingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlottingRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthIdentity_tenantId_provider_providerUserId_key" ON "OAuthIdentity"("tenantId", "provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_resource_action_key" ON "RolePermission"("roleId", "resource", "action");

-- CreateIndex
CREATE INDEX "AccessReview_tenantId_status_idx" ON "AccessReview"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AccessReview_tenantId_createdAt_idx" ON "AccessReview"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceSetting_tenantId_key" ON "ComplianceSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionReviewSetting_tenantId_key" ON "PermissionReviewSetting"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resource_idx" ON "AuditLog"("tenantId", "resource");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_idx" ON "AuditLog"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_expiresAt_idx" ON "AuditLog"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_code_key" ON "Customer"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Wave_tenantId_warehouseId_status_idx" ON "Wave"("tenantId", "warehouseId", "status");

-- CreateIndex
CREATE INDEX "WaveOrder_tenantId_waveId_idx" ON "WaveOrder"("tenantId", "waveId");

-- CreateIndex
CREATE INDEX "WaveOrder_tenantId_outboundOrderId_idx" ON "WaveOrder"("tenantId", "outboundOrderId");

-- CreateIndex
CREATE INDEX "WavePickingPath_tenantId_waveId_idx" ON "WavePickingPath"("tenantId", "waveId");

-- CreateIndex
CREATE UNIQUE INDEX "WavePickingPath_waveId_key" ON "WavePickingPath"("waveId");

-- CreateIndex
CREATE INDEX "IntegrationConfig_tenantId_idx" ON "IntegrationConfig"("tenantId");

-- CreateIndex
CREATE INDEX "IntegrationConfig_tenantId_type_idx" ON "IntegrationConfig"("tenantId", "type");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_idx" ON "WebhookSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_eventType_idx" ON "WebhookSubscription"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "IntegrationJob_tenantId_idx" ON "IntegrationJob"("tenantId");

-- CreateIndex
CREATE INDEX "IntegrationJob_tenantId_status_idx" ON "IntegrationJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventorySnapshot_tenantId_snapshotDate_idx" ON "InventorySnapshot"("tenantId", "snapshotDate");

-- CreateIndex
CREATE INDEX "InventorySnapshot_tenantId_snapshotDate_warehouseId_idx" ON "InventorySnapshot"("tenantId", "snapshotDate", "warehouseId");

-- CreateIndex
CREATE INDEX "InventorySnapshot_tenantId_snapshotDate_warehouseId_product_idx" ON "InventorySnapshot"("tenantId", "snapshotDate", "warehouseId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "KpiSnapshot_tenantId_kpiType_periodStart_periodEnd_idx" ON "KpiSnapshot"("tenantId", "kpiType", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "KpiSnapshot_tenantId_kpiType_warehouseId_periodStart_period_idx" ON "KpiSnapshot"("tenantId", "kpiType", "warehouseId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ReplenishmentPolicy_tenantId_warehouseId_productId_idx" ON "ReplenishmentPolicy"("tenantId", "warehouseId", "productId");

-- CreateIndex
CREATE INDEX "ReplenishmentSuggestion_tenantId_createdAt_idx" ON "ReplenishmentSuggestion"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ReplenishmentSuggestion_tenantId_policyId_idx" ON "ReplenishmentSuggestion"("tenantId", "policyId");

-- CreateIndex
CREATE INDEX "UsageMetric_tenantId_periodStart_periodEnd_idx" ON "UsageMetric"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BillingEvent_tenantId_idx" ON "BillingEvent"("tenantId");

-- CreateIndex
CREATE INDEX "SlottingConfig_tenantId_warehouseId_idx" ON "SlottingConfig"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "SlottingRecommendation_tenantId_warehouseId_idx" ON "SlottingRecommendation"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "Batch_tenantId_code_idx" ON "Batch"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Batch_tenantId_productId_code_idx" ON "Batch"("tenantId", "productId", "code");

-- CreateIndex
CREATE INDEX "Inventory_tenantId_warehouseId_productId_batchId_idx" ON "Inventory"("tenantId", "warehouseId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "MovementLine_tenantId_batchId_idx" ON "MovementLine"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "MovementLine_tenantId_productId_batchId_idx" ON "MovementLine"("tenantId", "productId", "batchId");

-- CreateIndex
CREATE INDEX "MovementLine_tenantId_productId_createdAt_idx" ON "MovementLine"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "MovementLine_tenantId_batchId_createdAt_idx" ON "MovementLine"("tenantId", "batchId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_customerId_idx" ON "OutboundOrder"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_customerRef_idx" ON "OutboundOrder"("tenantId", "customerRef");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_requestedShipDate_idx" ON "OutboundOrder"("tenantId", "requestedShipDate");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_status_requestedShipDate_idx" ON "OutboundOrder"("tenantId", "status", "requestedShipDate");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_routeCode_idx" ON "OutboundOrder"("tenantId", "routeCode");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_carrierCode_idx" ON "OutboundOrder"("tenantId", "carrierCode");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_zoneCode_idx" ON "OutboundOrder"("tenantId", "zoneCode");

-- CreateIndex
CREATE INDEX "OutboundOrder_tenantId_priority_idx" ON "OutboundOrder"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "OutboundOrderLine_tenantId_productId_idx" ON "OutboundOrderLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "OutboundOrderLine_tenantId_outboundOrderId_idx" ON "OutboundOrderLine"("tenantId", "outboundOrderId");

-- CreateIndex
CREATE INDEX "PickingTask_tenantId_completedAt_idx" ON "PickingTask"("tenantId", "completedAt");

-- CreateIndex
CREATE INDEX "PickingTask_tenantId_waveId_idx" ON "PickingTask"("tenantId", "waveId");

-- CreateIndex
CREATE INDEX "PickingTaskLine_tenantId_productId_idx" ON "PickingTaskLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_factorId_fkey" FOREIGN KEY ("factorId") REFERENCES "MfaFactor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSetting" ADD CONSTRAINT "ComplianceSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionReviewSetting" ADD CONSTRAINT "PermissionReviewSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTask" ADD CONSTRAINT "PickingTask_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickingTask" ADD CONSTRAINT "PickingTask_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_pickerUserId_fkey" FOREIGN KEY ("pickerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_outboundOrderId_fkey" FOREIGN KEY ("outboundOrderId") REFERENCES "OutboundOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WavePickingPath" ADD CONSTRAINT "WavePickingPath_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WavePickingPath" ADD CONSTRAINT "WavePickingPath_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WavePickingPath" ADD CONSTRAINT "WavePickingPath_pickerUserId_fkey" FOREIGN KEY ("pickerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConfig" ADD CONSTRAINT "IntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationJob" ADD CONSTRAINT "IntegrationJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationJob" ADD CONSTRAINT "IntegrationJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSnapshot" ADD CONSTRAINT "KpiSnapshot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentPolicy" ADD CONSTRAINT "ReplenishmentPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentPolicy" ADD CONSTRAINT "ReplenishmentPolicy_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentPolicy" ADD CONSTRAINT "ReplenishmentPolicy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentSuggestion" ADD CONSTRAINT "ReplenishmentSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentSuggestion" ADD CONSTRAINT "ReplenishmentSuggestion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ReplenishmentPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrder" ADD CONSTRAINT "TransferOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrderLine" ADD CONSTRAINT "TransferOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrderLine" ADD CONSTRAINT "TransferOrderLine_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "TransferOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrderLine" ADD CONSTRAINT "TransferOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlottingConfig" ADD CONSTRAINT "SlottingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlottingConfig" ADD CONSTRAINT "SlottingConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationCompatibilityRule" ADD CONSTRAINT "LocationCompatibilityRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationCompatibilityRule" ADD CONSTRAINT "LocationCompatibilityRule_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationCompatibilityRule" ADD CONSTRAINT "LocationCompatibilityRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlottingRecommendation" ADD CONSTRAINT "SlottingRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlottingRecommendation" ADD CONSTRAINT "SlottingRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlottingRecommendation" ADD CONSTRAINT "SlottingRecommendation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
