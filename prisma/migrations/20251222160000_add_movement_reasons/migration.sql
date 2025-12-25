-- CreateTable
CREATE TABLE "MovementReasonConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementReasonConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MovementHeader" ADD COLUMN "reasonId" TEXT;
ALTER TABLE "MovementHeader" ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "MovementReasonConfig_tenantId_idx" ON "MovementReasonConfig"("tenantId");
CREATE UNIQUE INDEX "MovementReasonConfig_tenantId_code_key" ON "MovementReasonConfig"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "MovementReasonConfig" ADD CONSTRAINT "MovementReasonConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovementHeader" ADD CONSTRAINT "MovementHeader_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "MovementReasonConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
