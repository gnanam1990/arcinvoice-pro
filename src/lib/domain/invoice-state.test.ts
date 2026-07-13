import { describe, expect, it } from "vitest";
import {
  assertCanAcceptPaymentIntent,
  assertInvoiceTransition,
  canAcceptPaymentIntent,
  canTransitionInvoiceStatus,
  InvoiceStateError,
  statusAfterPayment,
  statusIfOverdue,
  transitionInvoiceStatus,
} from "./invoice-state";

describe("canTransitionInvoiceStatus", () => {
  it("allows draft → issued and draft → cancelled", () => {
    expect(canTransitionInvoiceStatus("draft", "issued")).toBe(true);
    expect(canTransitionInvoiceStatus("draft", "cancelled")).toBe(true);
  });

  it("disallows draft → paid", () => {
    expect(canTransitionInvoiceStatus("draft", "paid")).toBe(false);
  });

  it("allows issued → partially_paid / paid / overdue / cancelled", () => {
    expect(canTransitionInvoiceStatus("issued", "partially_paid")).toBe(true);
    expect(canTransitionInvoiceStatus("issued", "paid")).toBe(true);
    expect(canTransitionInvoiceStatus("issued", "overdue")).toBe(true);
    expect(canTransitionInvoiceStatus("issued", "cancelled")).toBe(true);
  });

  it("treats paid and cancelled as terminal", () => {
    expect(canTransitionInvoiceStatus("paid", "cancelled")).toBe(false);
    expect(canTransitionInvoiceStatus("cancelled", "issued")).toBe(false);
    expect(canTransitionInvoiceStatus("paid", "partially_paid")).toBe(false);
  });
});

describe("assertInvoiceTransition / transitionInvoiceStatus", () => {
  it("returns target status when valid", () => {
    expect(transitionInvoiceStatus("draft", "issued")).toBe("issued");
  });

  it("throws InvoiceStateError when invalid", () => {
    expect(() => assertInvoiceTransition("paid", "draft")).toThrow(
      InvoiceStateError,
    );
    expect(() => transitionInvoiceStatus("cancelled", "paid")).toThrow(
      /Invalid invoice transition/,
    );
  });
});

describe("canAcceptPaymentIntent", () => {
  it("allows issued, partially_paid, and overdue", () => {
    expect(canAcceptPaymentIntent("issued")).toBe(true);
    expect(canAcceptPaymentIntent("partially_paid")).toBe(true);
    expect(canAcceptPaymentIntent("overdue")).toBe(true);
  });

  it("rejects cancelled, draft, and paid", () => {
    expect(canAcceptPaymentIntent("cancelled")).toBe(false);
    expect(canAcceptPaymentIntent("draft")).toBe(false);
    expect(canAcceptPaymentIntent("paid")).toBe(false);
  });

  it("assertCanAcceptPaymentIntent throws for cancelled", () => {
    expect(() => assertCanAcceptPaymentIntent("cancelled")).toThrow(
      /cannot accept new payment intents/,
    );
  });
});

describe("statusAfterPayment", () => {
  it("returns paid when amount due is zero", () => {
    expect(
      statusAfterPayment({
        currentStatus: "issued",
        amountDue: 0,
        amountPaid: 1000,
        total: 1000,
      }),
    ).toBe("paid");
  });

  it("returns partially_paid when residual due remains", () => {
    expect(
      statusAfterPayment({
        currentStatus: "issued",
        amountDue: 400,
        amountPaid: 600,
        total: 1000,
      }),
    ).toBe("partially_paid");
  });

  it("preserves overdue when no payment progress", () => {
    expect(
      statusAfterPayment({
        currentStatus: "overdue",
        amountDue: 1000,
        amountPaid: 0,
        total: 1000,
      }),
    ).toBe("overdue");
  });

  it("rejects payments on cancelled invoices", () => {
    expect(() =>
      statusAfterPayment({
        currentStatus: "cancelled",
        amountDue: 0,
        amountPaid: 100,
        total: 100,
      }),
    ).toThrow(InvoiceStateError);
  });

  it("rejects payments on draft invoices", () => {
    expect(() =>
      statusAfterPayment({
        currentStatus: "draft",
        amountDue: 100,
        amountPaid: 0,
        total: 100,
      }),
    ).toThrow(InvoiceStateError);
  });
});

describe("statusIfOverdue", () => {
  it("marks issued invoices overdue after due date", () => {
    expect(
      statusIfOverdue({
        currentStatus: "issued",
        dueDate: "2020-01-01",
        now: new Date("2020-01-02T00:00:00.000Z"),
      }),
    ).toBe("overdue");
  });

  it("does not change paid or cancelled", () => {
    expect(
      statusIfOverdue({
        currentStatus: "paid",
        dueDate: "2020-01-01",
        now: new Date("2020-02-01"),
      }),
    ).toBe("paid");
    expect(
      statusIfOverdue({
        currentStatus: "cancelled",
        dueDate: "2020-01-01",
        now: new Date("2020-02-01"),
      }),
    ).toBe("cancelled");
  });
});
