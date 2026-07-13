/**
 * Integer base-unit money helpers.
 * Never use floating-point arithmetic for money.
 */

export type MoneyInt = number;

export type LineInput = {
  quantity: MoneyInt;
  unitPrice: MoneyInt;
};

export type AmountBreakdown = {
  subtotal: MoneyInt;
  tax: MoneyInt;
  discount: MoneyInt;
  total: MoneyInt;
};

export type PaymentApplication = {
  amountPaid: MoneyInt;
  amountDue: MoneyInt;
  overpaymentAmount: MoneyInt;
  hasOverpayment: boolean;
};

export class AmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmountError";
  }
}

function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new AmountError(`${field} must be an integer base unit, got ${value}`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  assertInteger(value, field);
  if (value < 0) {
    throw new AmountError(`${field} must be >= 0, got ${value}`);
  }
}

/**
 * Line amount = quantity * unitPrice (both integers).
 */
export function calculateLineAmount(
  quantity: MoneyInt,
  unitPrice: MoneyInt,
): MoneyInt {
  assertInteger(quantity, "quantity");
  assertInteger(unitPrice, "unitPrice");
  if (quantity <= 0) {
    throw new AmountError("quantity must be > 0");
  }
  if (unitPrice < 0) {
    throw new AmountError("unitPrice must be >= 0");
  }

  const amount = quantity * unitPrice;
  if (!Number.isSafeInteger(amount)) {
    throw new AmountError("line amount exceeds safe integer range");
  }
  return amount;
}

/**
 * Subtotal is the sum of line amounts (integer).
 */
export function calculateSubtotal(lines: LineInput[]): MoneyInt {
  let subtotal = 0;
  for (const line of lines) {
    const amount = calculateLineAmount(line.quantity, line.unitPrice);
    subtotal += amount;
    if (!Number.isSafeInteger(subtotal)) {
      throw new AmountError("subtotal exceeds safe integer range");
    }
  }
  return subtotal;
}

/**
 * total = subtotal + tax - discount
 * Rejects negative totals.
 */
export function calculateInvoiceTotals(input: {
  lines: LineInput[];
  tax?: MoneyInt;
  discount?: MoneyInt;
}): AmountBreakdown {
  const tax = input.tax ?? 0;
  const discount = input.discount ?? 0;
  assertNonNegativeInteger(tax, "tax");
  assertNonNegativeInteger(discount, "discount");

  const subtotal = calculateSubtotal(input.lines);
  const total = subtotal + tax - discount;

  if (!Number.isSafeInteger(total)) {
    throw new AmountError("total exceeds safe integer range");
  }
  if (total < 0) {
    throw new AmountError(
      `total must be >= 0 (subtotal=${subtotal}, tax=${tax}, discount=${discount})`,
    );
  }

  return { subtotal, tax, discount, total };
}

/**
 * Apply a payment against total using integer arithmetic.
 * If cumulative paid would exceed total, records overpayment instead of
 * silently clamping without state.
 */
export function applyPayment(input: {
  total: MoneyInt;
  currentAmountPaid: MoneyInt;
  paymentAmount: MoneyInt;
}): PaymentApplication {
  const { total, currentAmountPaid, paymentAmount } = input;
  assertNonNegativeInteger(total, "total");
  assertNonNegativeInteger(currentAmountPaid, "currentAmountPaid");
  assertInteger(paymentAmount, "paymentAmount");

  if (paymentAmount <= 0) {
    throw new AmountError("paymentAmount must be > 0");
  }

  const nextPaid = currentAmountPaid + paymentAmount;
  if (!Number.isSafeInteger(nextPaid)) {
    throw new AmountError("amount paid exceeds safe integer range");
  }

  if (nextPaid <= total) {
    return {
      amountPaid: nextPaid,
      amountDue: total - nextPaid,
      overpaymentAmount: 0,
      hasOverpayment: false,
    };
  }

  const overpaymentAmount = nextPaid - total;
  return {
    amountPaid: nextPaid,
    amountDue: 0,
    overpaymentAmount,
    hasOverpayment: true,
  };
}

/**
 * Derive amount due / overpayment from absolute paid + total.
 */
export function deriveBalances(input: {
  total: MoneyInt;
  amountPaid: MoneyInt;
}): PaymentApplication {
  const { total, amountPaid } = input;
  assertNonNegativeInteger(total, "total");
  assertNonNegativeInteger(amountPaid, "amountPaid");

  if (amountPaid <= total) {
    return {
      amountPaid,
      amountDue: total - amountPaid,
      overpaymentAmount: 0,
      hasOverpayment: false,
    };
  }

  return {
    amountPaid,
    amountDue: 0,
    overpaymentAmount: amountPaid - total,
    hasOverpayment: true,
  };
}

/**
 * Format integer base units for display only (not for calculation).
 */
export function formatBaseUnits(
  amount: MoneyInt,
  tokenDecimals: number,
): string {
  assertInteger(amount, "amount");
  assertInteger(tokenDecimals, "tokenDecimals");
  if (tokenDecimals < 0 || tokenDecimals > 18) {
    throw new AmountError("tokenDecimals must be between 0 and 18");
  }

  const negative = amount < 0;
  const abs = Math.abs(amount).toString().padStart(tokenDecimals + 1, "0");

  if (tokenDecimals === 0) {
    return negative ? `-${abs}` : abs;
  }

  const whole = abs.slice(0, -tokenDecimals) || "0";
  const fraction = abs.slice(-tokenDecimals);
  const formatted = `${whole}.${fraction}`;
  return negative ? `-${formatted}` : formatted;
}
