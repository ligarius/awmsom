-- Store API keys as salted hashes and remove plaintext storage
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;

UPDATE "ApiKey" SET "keyHash" = crypt("key", gen_salt('bf', 10));

ALTER TABLE "ApiKey" ALTER COLUMN "keyHash" SET NOT NULL;

DROP INDEX IF EXISTS "ApiKey_key_key";

ALTER TABLE "ApiKey" DROP COLUMN "key";

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
