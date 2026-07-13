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

/** ISO 3166-1 alpha-2 country code. */
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code (e.g. US)");

/**
 * EVM-style wallet address validation (0x + 40 hex).
 * Presentation / uniqueness only — no chain calls.
 */
export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Wallet must be a valid 0x address");

export const optionalWalletAddressSchema = z
  .union([walletAddressSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    return v;
  });

export const optionalCountrySchema = z
  .union([countryCodeSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    return v;
  });

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

const billingFields = {
  company: z.string().trim().max(200).nullable().optional(),
  addressLine1: z.string().trim().max(300).nullable().optional(),
  addressLine2: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(40).nullable().optional(),
  country: optionalCountrySchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  walletAddress: optionalWalletAddressSchema,
};

export const customerCreateSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required").max(320),
  ...billingFields,
});

export const customerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  ...billingFields,
});

/** Form schema without organizationId (injected server-side). */
export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required").max(320),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  walletAddress: z.string().trim().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(300).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const invoiceLineInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().positive(),
  unitPrice: nonNegativeMoneyIntSchema,
  position: z.number().int().min(0).optional(),
});

export const invoiceCreateSchema = z.object({
  organizationId: uuidSchema,
  customerId: uuidSchema,
  number: z.string().trim().min(1).max(64).optional(),
  currency: z.string().trim().min(1).max(16).default("USD"),
  tokenDecimals: z.number().int().min(0).max(18).default(2),
  tax: nonNegativeMoneyIntSchema.default(0),
  discount: nonNegativeMoneyIntSchema.default(0),
  allowPartialPayments: z.boolean().default(true),
  issueDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  memo: z.string().trim().max(2000).nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1, "Add at least one line item"),
});

export const invoiceUpdateDraftSchema = z.object({
  customerId: uuidSchema.optional(),
  currency: z.string().trim().min(1).max(16).optional(),
  tokenDecimals: z.number().int().min(0).max(18).optional(),
  tax: nonNegativeMoneyIntSchema.optional(),
  discount: nonNegativeMoneyIntSchema.optional(),
  issueDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  memo: z.string().trim().max(2000).nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1).optional(),
});

/** Multi-step form payload (client → server action). */
export const invoiceFormSchema = z.object({
  customerId: uuidSchema,
  currency: z.string().trim().min(1).max(16).default("USD"),
  tokenDecimals: z.number().int().min(0).max(18).default(2),
  tax: nonNegativeMoneyIntSchema.default(0),
  discount: nonNegativeMoneyIntSchema.default(0),
  issueDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  memo: z.string().trim().max(2000).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Description required").max(500),
        quantity: z.number().int().positive("Quantity must be ≥ 1"),
        unitPrice: nonNegativeMoneyIntSchema,
      }),
    )
    .min(1, "Add at least one line item"),
});

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export const paymentIntentStatusSchema = z.enum(PAYMENT_INTENT_STATUSES);
export const customerStatusSchema = z.enum(["active", "archived"]);

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

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.string().optional(),
});

export type OrganizationCreateInput = z.input<typeof organizationCreateSchema>;
export type CustomerCreateInput = z.input<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.input<typeof customerUpdateSchema>;
export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type InvoiceCreateInput = z.input<typeof invoiceCreateSchema>;
export type InvoiceUpdateDraftInput = z.input<typeof invoiceUpdateDraftSchema>;
export type InvoiceFormInput = z.input<typeof invoiceFormSchema>;
export type PaymentIntentCreateInput = z.input<
  typeof paymentIntentCreateSchema
>;
