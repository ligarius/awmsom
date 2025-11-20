-- Add batch tracking fields to movement lines
ALTER TABLE "MovementLine" ADD COLUMN "batchCode" TEXT;
ALTER TABLE "MovementLine" ADD COLUMN "expiryDate" TIMESTAMP(3);
