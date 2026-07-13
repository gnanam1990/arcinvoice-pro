CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'link_copied';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'public_viewed';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'receipt_created';--> statement-breakpoint

ALTER TABLE "onchain_payments" ALTER COLUMN "network" SET DEFAULT 'arc-testnet';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "merchant_wallet_address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "branding_tagline" text;--> statement-breakpoint
ALTER TABLE "onchain_payments" ADD COLUMN IF NOT EXISTS "payer_address" text;--> statement-breakpoint
ALTER TABLE "onchain_payments" ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone;--> statement-breakpoint
-- Invoice public token hash: add nullable, backfill from existing token, then enforce NOT NULL
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "public_payment_token_hash" text;--> statement-breakpoint
UPDATE "invoices"
SET "public_payment_token_hash" = encode(digest(convert_to("public_payment_token", 'UTF8'), 'sha256'), 'hex')
WHERE "public_payment_token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "public_payment_token_hash" SET NOT NULL;--> statement-breakpoint
-- Receipts: expand with public tokens + immutable snapshot (backfill existing demo rows)
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "onchain_payment_id" uuid;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "token_decimals" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "public_token" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "public_token_hash" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "snapshot" jsonb;--> statement-breakpoint
UPDATE "receipts"
SET
  "public_token" = coalesce(
    "public_token",
    encode(gen_random_bytes(32), 'hex')
  ),
  "snapshot" = coalesce(
    "snapshot",
    jsonb_build_object(
      'invoiceNumber', 'UNKNOWN',
      'amount', "amount",
      'currency', "currency",
      'asset', "currency",
      'tokenDecimals', 2,
      'network', 'arc-testnet',
      'txHash', null,
      'finalizedAt', coalesce("issued_at", now()),
      'payerAddress', null,
      'merchantAddress', null,
      'memo', null,
      'remainingBalance', 0,
      'paymentIntentId', "payment_intent_id",
      'onchainPaymentId', null,
      'capturedAt', now()
    )
  )
WHERE "public_token" IS NULL OR "snapshot" IS NULL;--> statement-breakpoint
UPDATE "receipts"
SET "public_token_hash" = encode(digest(convert_to("public_token", 'UTF8'), 'sha256'), 'hex')
WHERE "public_token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "public_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "public_token_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "snapshot" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "receipts" ADD CONSTRAINT "receipts_onchain_payment_id_onchain_payments_id_fk"
 FOREIGN KEY ("onchain_payment_id") REFERENCES "public"."onchain_payments"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_public_payment_token_hash_uidx" ON "invoices" USING btree ("public_payment_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_public_token_uidx" ON "receipts" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_public_token_hash_uidx" ON "receipts" USING btree ("public_token_hash");
