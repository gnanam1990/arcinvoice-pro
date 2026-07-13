ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'merchant_wallet_updated';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'payment_intent_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'payment_intent_expired';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'payment_intent_cancelled';--> statement-breakpoint
-- Expand payment_intent_status enum (Postgres: recreate via text cast)
ALTER TABLE "payment_intents" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."payment_intent_status";--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('pending', 'ready', 'expired', 'cancelled', 'failed', 'submitted', 'confirming', 'settled', 'action_required');--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "status" SET DATA TYPE "public"."payment_intent_status" USING "status"::"public"."payment_intent_status";--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."payment_intent_status";--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "allow_partial_payments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Payment intent preparation columns (backfill existing rows)
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "payer_address" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "recipient_address" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "chain_id" integer DEFAULT 5042002;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "network" text DEFAULT 'arc-testnet';--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "memo" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "invoice_number" text;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "payment_intents" pi
SET
  "idempotency_key" = coalesce(pi."idempotency_key", 'legacy-' || pi."id"::text),
  "recipient_address" = coalesce(pi."recipient_address", '0x0000000000000000000000000000000000000001'),
  "chain_id" = coalesce(pi."chain_id", 5042002),
  "network" = coalesce(pi."network", 'arc-testnet'),
  "invoice_number" = coalesce(pi."invoice_number", inv."number", 'UNKNOWN'),
  "expires_at" = coalesce(pi."expires_at", pi."created_at" + interval '15 minutes', now() + interval '15 minutes')
FROM "invoices" inv
WHERE inv."id" = pi."invoice_id"
  AND (
    pi."idempotency_key" IS NULL
    OR pi."recipient_address" IS NULL
    OR pi."invoice_number" IS NULL
    OR pi."expires_at" IS NULL
  );--> statement-breakpoint
UPDATE "payment_intents"
SET
  "idempotency_key" = coalesce("idempotency_key", 'legacy-' || "id"::text),
  "recipient_address" = coalesce("recipient_address", '0x0000000000000000000000000000000000000001'),
  "chain_id" = coalesce("chain_id", 5042002),
  "network" = coalesce("network", 'arc-testnet'),
  "invoice_number" = coalesce("invoice_number", 'UNKNOWN'),
  "expires_at" = coalesce("expires_at", now() + interval '15 minutes')
WHERE "idempotency_key" IS NULL
   OR "recipient_address" IS NULL
   OR "invoice_number" IS NULL
   OR "expires_at" IS NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "recipient_address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "chain_id" SET DEFAULT 5042002;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "chain_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "network" SET DEFAULT 'arc-testnet';--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "network" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "invoice_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_intents_idempotency_uidx" ON "payment_intents" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_intents_active_lookup_idx" ON "payment_intents" USING btree ("invoice_id","payer_address","amount","status");
