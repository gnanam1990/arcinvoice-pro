import { z } from "zod";
import {
  INVOICE_STATUSES,
  PAYMENT_INTENT_STATUSES,
} from "@/lib/domain/invoice-state";

/** Integer base-unit money — never floats. */
export const moneyIntSchema = z
  .number()
  .int("Money values must be integer base units")
  .finite();

export const nonNegativeMoneyIntSchema = moneyIntSchema.min(
  0,
  "Money values must be >= 0",
);

export const positiveMoneyIntSchema = moneyIntSchema.positive(
  "Money values must be > 0",
);

export const uuidSchema = z.string().uuid();

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
});

export const memberCreateSchema = z.object({
  organizationId: uuidSchema,
  email: z.string().email(),
  name: z.string().trim().min(1).max(200),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export const customerCreateSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  company: z.string().trim().max(200).nullable().optional(),
  addressLine1: z.string().trim().max(300).nullable().optional(),
  addressLine2: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(2).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const customerUpdateSchema = customerCreateSchema
  .omit({ organizationId: true })
  .partial();

export const invoiceLineInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().positive(),
  unitPrice: nonNegativeMoneyIntSchema,
  position: z.number().int().min(0).optional(),
});

export const invoiceCreateSchema = z.object({
  organizationId: uuidSchema,
  customerId: uuidSchema,
  number: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(1).max(16).default("USD"),
  tokenDecimals: z.number().int().min(0).max(18).default(2),
  tax: nonNegativeMoneyIntSchema.default(0),
  discount: nonNegativeMoneyIntSchema.default(0),
  issueDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  memo: z.string().trim().max(2000).nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1),
});

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export const paymentIntentStatusSchema = z.enum(PAYMENT_INTENT_STATUSES);

export const paymentIntentCreateSchema = z.object({
  organizationId: uuidSchema,
  invoiceId: uuidSchema,
  amount: positiveMoneyIntSchema,
  currency: z.string().trim().min(1).max(16),
  tokenDecimals: z.number().int().min(0).max(18).default(2),
});

export const applyPaymentSchema = z.object({
  paymentAmount: positiveMoneyIntSchema,
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type PaymentIntentCreateInput = z.infer<
  typeof paymentIntentCreateSchema
>;
