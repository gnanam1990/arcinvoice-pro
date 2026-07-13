import { describe, expect, it } from "vitest";
import {
  AmountError,
  applyPayment,
  calculateInvoiceTotals,
  calculateLineAmount,
  calculateSubtotal,
  deriveBalances,
  formatBaseUnits,
} from "./amounts";

describe("calculateLineAmount", () => {
  it("multiplies integer quantity and unit price", () => {
    expect(calculateLineAmount(3, 2500)).toBe(7500);
  });

  it("rejects non-integer inputs", () => {
    expect(() => calculateLineAmount(1.5, 100)).toThrow(AmountError);
    expect(() => calculateLineAmount(1, 10.5)).toThrow(AmountError);
  });

  it("rejects non-positive quantity", () => {
    expect(() => calculateLineAmount(0, 100)).toThrow(AmountError);
    expect(() => calculateLineAmount(-1, 100)).toThrow(AmountError);
  });

  it("rejects negative unit price", () => {
    expect(() => calculateLineAmount(1, -1)).toThrow(AmountError);
  });
});

describe("calculateSubtotal", () => {
  it("sums line amounts as integers", () => {
    expect(
      calculateSubtotal([
        { quantity: 2, unitPrice: 1000 },
        { quantity: 1, unitPrice: 500 },
      ]),
    ).toBe(2500);
  });
});

describe("calculateInvoiceTotals", () => {
  it("computes total = subtotal + tax - discount", () => {
    expect(
      calculateInvoiceTotals({
        lines: [
          { quantity: 2, unitPrice: 10000 },
          { quantity: 1, unitPrice: 5000 },
        ],
        tax: 2500,
        discount: 1000,
      }),
    ).toEqual({
      subtotal: 25000,
      tax: 2500,
      discount: 1000,
      total: 26500,
    });
  });

  it("prevents negative totals", () => {
    expect(() =>
      calculateInvoiceTotals({
        lines: [{ quantity: 1, unitPrice: 100 }],
        tax: 0,
        discount: 200,
      }),
    ).toThrow(/total must be >= 0/);
  });

  it("defaults tax and discount to zero", () => {
    expect(
      calculateInvoiceTotals({
        lines: [{ quantity: 1, unitPrice: 999 }],
      }),
    ).toEqual({
      subtotal: 999,
      tax: 0,
      discount: 0,
      total: 999,
    });
  });

  it("rejects floating-point tax", () => {
    expect(() =>
      calculateInvoiceTotals({
        lines: [{ quantity: 1, unitPrice: 100 }],
        tax: 1.5,
      }),
    ).toThrow(AmountError);
  });
});

describe("applyPayment", () => {
  it("reduces amount due without overpayment", () => {
    expect(
      applyPayment({
        total: 10000,
        currentAmountPaid: 2000,
        paymentAmount: 3000,
      }),
    ).toEqual({
      amountPaid: 5000,
      amountDue: 5000,
      overpaymentAmount: 0,
      hasOverpayment: false,
    });
  });

  it("records overpayment when paid exceeds total", () => {
    expect(
      applyPayment({
        total: 10000,
        currentAmountPaid: 9000,
        paymentAmount: 2000,
      }),
    ).toEqual({
      amountPaid: 11000,
      amountDue: 0,
      overpaymentAmount: 1000,
      hasOverpayment: true,
    });
  });

  it("rejects non-positive payments", () => {
    expect(() =>
      applyPayment({
        total: 100,
        currentAmountPaid: 0,
        paymentAmount: 0,
      }),
    ).toThrow(AmountError);
  });
});

describe("deriveBalances", () => {
  it("derives due from paid and total", () => {
    expect(deriveBalances({ total: 500, amountPaid: 200 })).toEqual({
      amountPaid: 200,
      amountDue: 300,
      overpaymentAmount: 0,
      hasOverpayment: false,
    });
  });

  it("flags overpayment when paid exceeds total", () => {
    expect(deriveBalances({ total: 500, amountPaid: 600 })).toEqual({
      amountPaid: 600,
      amountDue: 0,
      overpaymentAmount: 100,
      hasOverpayment: true,
    });
  });
});

describe("formatBaseUnits", () => {
  it("formats cents for display only", () => {
    expect(formatBaseUnits(12345, 2)).toBe("123.45");
    expect(formatBaseUnits(5, 2)).toBe("0.05");
    expect(formatBaseUnits(100, 0)).toBe("100");
  });
});
