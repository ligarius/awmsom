-- Add batch tracking fields to movement lines
ALTER TABLE "MovementLine" ADD COLUMN IF NOT EXISTS "batchCode" TEXT;
ALTER TABLE "MovementLine" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
