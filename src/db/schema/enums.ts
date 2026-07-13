import { pgEnum } from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "archived",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentIntentStatusEnum = pgEnum("payment_intent_status", [
  "pending",
  "submitted",
  "confirming",
  "settled",
  "failed",
  "action_required",
]);

export const onchainPaymentStatusEnum = pgEnum("onchain_payment_status", [
  "pending",
  "submitted",
  "confirming",
  "settled",
  "failed",
]);

export const reminderChannelEnum = pgEnum("reminder_channel", [
  "email",
  "in_app",
  "webhook",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "payment_recorded",
  "issued",
  "cancelled",
  "reminder_sent",
  "receipt_issued",
  "link_copied",
  "public_viewed",
  "receipt_created",
]);
