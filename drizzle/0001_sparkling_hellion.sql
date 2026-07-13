CREATE TYPE "public"."customer_status" AS ENUM('active', 'archived');--> statement-breakpoint
DROP INDEX "customers_org_email_idx";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "status" "customer_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "customers_org_status_idx" ON "customers" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_email_uidx" ON "customers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_wallet_uidx" ON "customers" USING btree ("organization_id","wallet_address") WHERE "customers"."wallet_address" is not null;