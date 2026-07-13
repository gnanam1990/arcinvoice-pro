"use client";

import { useState, useTransition } from "react";
import { recordPublicLinkCopiedAction } from "@/app/actions/public-invoice";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  absoluteUrl,
  publicInvoicePath,
  publicInvoicePrintPath,
} from "@/lib/config/public";
import { isPublicViewableStatus } from "@/lib/public/invoice-dto";

type PublicInvoiceActionsProps = {
  invoiceId: string;
  status: string;
  publicPaymentToken: string | null;
  preview?: boolean;
};

export function PublicInvoiceActions({
  invoiceId,
  status,
  publicPaymentToken,
  preview = false,
}: PublicInvoiceActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!publicPaymentToken || !isPublicViewableStatus(status)) {
    return (
      <p className="text-sm text-muted">
        Public page is available after the invoice is issued (not for draft or
        cancelled).
      </p>
    );
  }

  const publicPath = publicInvoicePath(publicPaymentToken);
  const printPath = publicInvoicePrintPath(publicPaymentToken);
  const publicUrl = absoluteUrl(publicPath);

  function copyLink() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setMessage("Secure public link copied");
        await recordPublicLinkCopiedAction(invoiceId);
      } catch {
        setError("Could not copy link");
      }
    });
  }

  async function share() {
    setError(null);
    setMessage(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Invoice",
          url: publicUrl,
        });
        await recordPublicLinkCopiedAction(invoiceId);
        return;
      } catch {
        // fall through
      }
    }
    copyLink();
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {preview ? "Public preview" : "Public link"}
        </h3>
        <span className="font-mono text-[11px] text-muted break-all">
          {publicPath}
        </span>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          data-testid="open-public-page"
        >
          Open public page
        </Button>
        <Button
          href={printPath}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
          data-testid="print-invoice"
        >
          Print invoice
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={copyLink}
          data-testid="copy-public-link"
        >
          Copy public link
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={share}>
          Share
        </Button>
      </div>
    </div>
  );
}
