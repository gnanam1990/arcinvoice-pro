"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createInvoiceDraftAction,
  updateInvoiceDraftAction,
} from "@/app/actions/invoices";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { calculateInvoiceTotals } from "@/lib/domain/amounts";
import { formatMoney } from "@/lib/format";
import { parseMoneyField } from "@/lib/money/parse";
import { cn } from "@/lib/utils";
import type { InvoiceFormInput } from "@/lib/validation/schemas";

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
  company: string | null;
};

type LineDraft = {
  key: string;
  description: string;
  quantity: number;
  unitPriceDisplay: string;
};

type InvoiceFormProps = {
  mode: "create" | "edit";
  invoiceId?: string;
  customers: CustomerOption[];
  initial?: {
    customerId?: string;
    currency?: string;
    tokenDecimals?: number;
    taxDisplay?: string;
    discountDisplay?: string;
    issueDate?: string;
    dueDate?: string;
    notes?: string;
    memo?: string;
    lines?: LineDraft[];
  };
};

const steps = ["Customer", "Line items", "Details", "Review"] as const;

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPriceDisplay: "0.00",
  };
}

export function InvoiceForm({
  mode,
  invoiceId,
  customers,
  initial,
}: InvoiceFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [tokenDecimals] = useState(initial?.tokenDecimals ?? 2);
  const [taxDisplay, setTaxDisplay] = useState(initial?.taxDisplay ?? "0.00");
  const [discountDisplay, setDiscountDisplay] = useState(
    initial?.discountDisplay ?? "0.00",
  );
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines?.length ? initial.lines : [newLine()],
  );

  const totals = useMemo(() => {
    try {
      const parsedLines = lines.map((l) => ({
        quantity: l.quantity,
        unitPrice: parseMoneyField(l.unitPriceDisplay, tokenDecimals),
      }));
      const tax = parseMoneyField(taxDisplay, tokenDecimals);
      const discount = parseMoneyField(discountDisplay, tokenDecimals);
      return calculateInvoiceTotals({ lines: parsedLines, tax, discount });
    } catch {
      return null;
    }
  }, [lines, taxDisplay, discountDisplay, tokenDecimals]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function moveLine(key: string, dir: -1 | 1) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  }

  function buildPayload(): InvoiceFormInput | null {
    try {
      return {
        customerId,
        currency,
        tokenDecimals,
        tax: parseMoneyField(taxDisplay, tokenDecimals),
        discount: parseMoneyField(discountDisplay, tokenDecimals),
        issueDate,
        dueDate,
        notes,
        memo,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: parseMoneyField(l.unitPriceDisplay, tokenDecimals),
        })),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid amounts");
      return null;
    }
  }

  function canProceed(): boolean {
    if (step === 0) return Boolean(customerId);
    if (step === 1) {
      return (
        lines.length > 0 &&
        lines.every((l) => l.description.trim() && l.quantity > 0)
      );
    }
    return true;
  }

  function saveDraft() {
    setError(null);
    setFieldErrors({});
    const payload = buildPayload();
    if (!payload) return;

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createInvoiceDraftAction(payload)
          : await updateInvoiceDraftAction(invoiceId!, payload);

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push(`/dashboard/invoices/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                i === step
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-border text-muted hover:bg-surface-sunken",
              )}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <Alert tone="error" title="Could not save invoice">
          {error}
        </Alert>
      ) : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Select customer
          </h2>
          {customers.length === 0 ? (
            <Alert tone="warning">
              No active customers.{" "}
              <Link href="/dashboard/customers/new" className="underline">
                Create a customer
              </Link>{" "}
              first.
            </Alert>
          ) : (
            <div>
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                id="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                data-testid="invoice-customer"
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.email}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.customerId?.[0]} />
              <p className="mt-2 text-xs text-muted">
                Need a new customer?{" "}
                <Link
                  href="/dashboard/customers/new"
                  className="font-medium text-accent underline"
                >
                  Create customer
                </Link>
              </p>
            </div>
          )}
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Line items
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLines((prev) => [...prev, newLine()])}
            >
              Add line
            </Button>
          </div>
          <ul className="space-y-4">
            {lines.map((line, index) => (
              <li
                key={line.key}
                className="grid gap-3 rounded-[var(--radius-lg)] border border-border p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <Label>Description *</Label>
                  <Input
                    value={line.description}
                    onChange={(e) =>
                      updateLine(line.key, { description: e.target.value })
                    }
                    data-testid={`line-desc-${index}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Qty *</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    data-testid={`line-qty-${index}`}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label>Unit price *</Label>
                  <Input
                    value={line.unitPriceDisplay}
                    onChange={(e) =>
                      updateLine(line.key, {
                        unitPriceDisplay: e.target.value,
                      })
                    }
                    data-testid={`line-price-${index}`}
                  />
                </div>
                <div className="flex items-end gap-1 sm:col-span-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Move up"
                    onClick={() => moveLine(line.key, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Move down"
                    onClick={() => moveLine(line.key, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove line"
                    onClick={() =>
                      setLines((prev) =>
                        prev.length === 1
                          ? prev
                          : prev.filter((l) => l.key !== line.key),
                      )
                    }
                  >
                    ×
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tax">Tax (major units)</Label>
              <Input
                id="tax"
                value={taxDisplay}
                onChange={(e) => setTaxDisplay(e.target.value)}
                data-testid="invoice-tax"
              />
            </div>
            <div>
              <Label htmlFor="discount">Discount (major units)</Label>
              <Input
                id="discount"
                value={discountDisplay}
                onChange={(e) => setDiscountDisplay(e.target.value)}
                data-testid="invoice-discount"
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="issueDate">Issue date</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="invoice-due-date"
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="memo">Memo</Label>
            <Input
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">Review</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Customer</dt>
              <dd className="font-medium">
                {customers.find((c) => c.id === customerId)?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Lines</dt>
              <dd className="font-medium">{lines.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-mono">
                {totals
                  ? formatMoney(totals.subtotal, currency, tokenDecimals)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Tax</dt>
              <dd className="font-mono">
                {totals
                  ? formatMoney(totals.tax, currency, tokenDecimals)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Discount</dt>
              <dd className="font-mono">
                {totals
                  ? formatMoney(totals.discount, currency, tokenDecimals)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total</dt>
              <dd className="font-mono font-semibold">
                {totals
                  ? formatMoney(totals.total, currency, tokenDecimals)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Amount paid</dt>
              <dd className="font-mono">
                {formatMoney(0, currency, tokenDecimals)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Amount due</dt>
              <dd className="font-mono">
                {totals
                  ? formatMoney(totals.total, currency, tokenDecimals)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {step < steps.length - 1 ? (
            <Button
              type="button"
              disabled={!canProceed() || pending}
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canProceed() || pending || !totals}
              onClick={saveDraft}
              data-testid="invoice-save-draft"
            >
              {pending ? "Saving…" : "Save draft"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
