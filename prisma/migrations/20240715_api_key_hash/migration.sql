-- Ensure pgcrypto is available for hashing when migrating existing plaintext keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add the keyHash column when missing so existing installations can be updated safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ApiKey' AND column_name = 'keyHash'
  ) THEN
    ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;
  END IF;
END $$;

-- Backfill keyHash from legacy plaintext column when needed using SHA-256
UPDATE "ApiKey"
SET "keyHash" = encode(digest(COALESCE("keyHash", ''), 'sha256'), 'hex')
WHERE "keyHash" IS NOT NULL AND "keyHash" NOT LIKE '[0-9a-f]%'::text AND length("keyHash") <> 64;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ApiKey' AND column_name = 'key'
  ) THEN
    UPDATE "ApiKey"
    SET "keyHash" = encode(digest("key", 'sha256'), 'hex')
    WHERE "keyHash" IS NULL AND "key" IS NOT NULL;
  END IF;
END $$;

-- Ensure any rows missing both plaintext and hashed values still get a deterministic placeholder
UPDATE "ApiKey"
SET "keyHash" = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
WHERE "keyHash" IS NULL;

-- Enforce the expected not-null constraint once backfilled
ALTER TABLE "ApiKey" ALTER COLUMN "keyHash" SET NOT NULL;

-- Drop the legacy plaintext column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ApiKey' AND column_name = 'key'
  ) THEN
    ALTER TABLE "ApiKey" DROP COLUMN "key";
  END IF;
END $$;

-- Ensure the unique index for hashes exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'ApiKey' AND indexname = 'ApiKey_keyHash_key'
  ) THEN
    CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
  END IF;
END $$;

-- Ensure the tenant index exists in case a failed migration removed it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'ApiKey' AND indexname = 'ApiKey_tenantId_idx'
  ) THEN
    CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");
  END IF;
END $$;
