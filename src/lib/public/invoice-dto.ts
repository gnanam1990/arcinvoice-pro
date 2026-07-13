import type { InvoiceSnapshot } from "@/db/schema";
import type { InvoiceStatus } from "@/lib/domain/invoice-state";

/** Public customer view — strips internal IDs and private notes. */
export type PublicCustomerView = {
  name: string;
  email: string;
  company: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
};

export type PublicLineView = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  position: number;
};

export type PublicInvoiceView = {
  invoiceNumber: string;
  status: Extract<
    InvoiceStatus,
    "issued" | "partially_paid" | "paid" | "overdue"
  >;
  currency: string;
  tokenDecimals: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  issueDate: string | null;
  dueDate: string | null;
  /** Public payment memo only — never private notes. */
  memo: string | null;
  merchant: {
    name: string;
    tagline: string | null;
    walletAddress: string | null;
  };
  customer: PublicCustomerView | null;
  lines: PublicLineView[];
  networkLabel: string;
  isTestnet: boolean;
};

export const PUBLIC_VIEWABLE_STATUSES = [
  "issued",
  "partially_paid",
  "paid",
  "overdue",
] as const;

export type PublicViewableStatus = (typeof PUBLIC_VIEWABLE_STATUSES)[number];

export function isPublicViewableStatus(
  status: string,
): status is PublicViewableStatus {
  return (PUBLIC_VIEWABLE_STATUSES as readonly string[]).includes(status);
}

export function toPublicCustomer(
  snapshot: InvoiceSnapshot["customer"] | null | undefined,
): PublicCustomerView | null {
  if (!snapshot) return null;
  return {
    name: snapshot.name,
    email: snapshot.email,
    company: snapshot.company,
    addressLine1: snapshot.addressLine1,
    addressLine2: snapshot.addressLine2,
    city: snapshot.city,
    region: snapshot.region,
    postalCode: snapshot.postalCode,
    country: snapshot.country,
  };
}

export function toPublicLines(
  snapshot: InvoiceSnapshot["lines"] | null | undefined,
): PublicLineView[] {
  if (!snapshot?.length) return [];
  return [...snapshot]
    .sort((a, b) => a.position - b.position)
    .map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
      position: line.position,
    }));
}
