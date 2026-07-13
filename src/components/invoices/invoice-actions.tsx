"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelInvoiceAction,
  duplicateInvoiceAction,
  issueInvoiceAction,
} from "@/app/actions/invoices";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type InvoiceActionsProps = {
  invoiceId: string;
  status: string;
  number: string;
  publicPaymentToken?: string | null;
};

export function InvoiceActions({
  invoiceId,
  status,
  number,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"issue" | "cancel" | null>(null);

  function run(
    action: () => Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }>,
    successMessage: string,
    redirectTo?: string,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      setDialog(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(successMessage);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <>
            <Button href={`/dashboard/invoices/${invoiceId}/edit`} variant="outline">
              Edit draft
            </Button>
            <Button type="button" onClick={() => setDialog("issue")}>
              Issue invoice
            </Button>
          </>
        ) : null}
        {status !== "cancelled" && status !== "paid" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialog("cancel")}
          >
            Cancel invoice
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(
              () => duplicateInvoiceAction(invoiceId),
              "Invoice duplicated as draft",
              undefined,
            )
          }
        >
          Duplicate
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === "issue"}
        title="Issue invoice?"
        description={`Issue ${number}? Customer and line items will be frozen in an immutable snapshot. This cannot be undone by editing.`}
        confirmLabel="Issue invoice"
        loading={pending}
        onConfirm={() =>
          run(() => issueInvoiceAction(invoiceId), "Invoice issued")
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        title="Cancel invoice?"
        description={`Cancel ${number}? Cancelled invoices cannot accept payment intents.`}
        confirmLabel="Cancel invoice"
        variant="danger"
        loading={pending}
        onConfirm={() =>
          run(() => cancelInvoiceAction(invoiceId), "Invoice cancelled")
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
