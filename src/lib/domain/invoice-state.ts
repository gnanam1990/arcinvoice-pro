/**
 * Invoice lifecycle transitions and payment-intent acceptance rules.
 */

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_INTENT_STATUSES = [
  "pending",
  "submitted",
  "confirming",
  "settled",
  "failed",
  "action_required",
] as const;

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

/** Allowed directed edges in the invoice state machine. */
const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["partially_paid", "paid", "overdue", "cancelled"],
  partially_paid: ["paid", "overdue", "cancelled"],
  overdue: ["partially_paid", "paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export class InvoiceStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceStateError";
  }
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function canTransitionInvoiceStatus(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): void {
  if (!canTransitionInvoiceStatus(from, to)) {
    throw new InvoiceStateError(
      `Invalid invoice transition: ${from} → ${to}`,
    );
  }
}

/**
 * Cancelled invoices cannot accept new payment intents.
 * Paid invoices also reject new intents (fully settled).
 * Draft invoices are not publicly payable.
 */
export function canAcceptPaymentIntent(status: InvoiceStatus): boolean {
  switch (status) {
    case "issued":
    case "partially_paid":
    case "overdue":
      return true;
    case "draft":
    case "paid":
    case "cancelled":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function assertCanAcceptPaymentIntent(status: InvoiceStatus): void {
  if (!canAcceptPaymentIntent(status)) {
    throw new InvoiceStateError(
      `Invoice in status "${status}" cannot accept new payment intents`,
    );
  }
}

/**
 * Derive payment-related status from balances after a payment is applied.
 * Does not handle overdue (date-based) or cancelled.
 */
export function statusAfterPayment(input: {
  currentStatus: InvoiceStatus;
  amountDue: number;
  amountPaid: number;
  total: number;
}): InvoiceStatus {
  const { currentStatus, amountDue, amountPaid, total } = input;

  if (currentStatus === "cancelled") {
    throw new InvoiceStateError("Cancelled invoices cannot record payments");
  }
  if (currentStatus === "draft") {
    throw new InvoiceStateError("Draft invoices cannot record payments");
  }

  if (amountDue === 0 && amountPaid >= total) {
    return "paid";
  }
  if (amountPaid > 0 && amountDue > 0) {
    return "partially_paid";
  }
  // No payment progress — preserve issued/overdue.
  if (currentStatus === "overdue") return "overdue";
  return "issued";
}

/**
 * Mark overdue only from open (non-terminal, non-draft) states when past due.
 */
export function statusIfOverdue(input: {
  currentStatus: InvoiceStatus;
  dueDate: Date | string | null;
  now?: Date;
}): InvoiceStatus {
  const { currentStatus, dueDate } = input;
  const now = input.now ?? new Date();

  if (!dueDate) return currentStatus;
  if (
    currentStatus === "draft" ||
    currentStatus === "paid" ||
    currentStatus === "cancelled"
  ) {
    return currentStatus;
  }

  const due =
    typeof dueDate === "string" ? new Date(`${dueDate}T23:59:59.999Z`) : dueDate;

  if (Number.isNaN(due.getTime())) {
    throw new InvoiceStateError("Invalid due date");
  }

  if (now.getTime() > due.getTime()) {
    if (canTransitionInvoiceStatus(currentStatus, "overdue") || currentStatus === "overdue") {
      return "overdue";
    }
  }

  return currentStatus;
}

export function transitionInvoiceStatus(
  from: InvoiceStatus,
  to: InvoiceStatus,
): InvoiceStatus {
  assertInvoiceTransition(from, to);
  return to;
}
