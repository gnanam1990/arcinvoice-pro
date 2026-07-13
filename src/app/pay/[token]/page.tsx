import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicInvoiceDocument } from "@/components/public/public-invoice-view";
import { PaymentPreparePanel } from "@/components/wallet/payment-prepare-panel";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { ArcTestnetBadge } from "@/components/wallet/arc-testnet-badge";
import { loadPublicInvoice } from "@/lib/public/load-public-invoice";
import { LinkCopiedAudit } from "@/components/public/link-copied-audit";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await loadPublicInvoice(token);
  if (!result.ok) {
    return {
      title: "Invoice unavailable",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Invoice ${result.view.invoiceNumber}`,
    description: `Public invoice from ${result.view.merchant.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicPayPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const result = await loadPublicInvoice(decoded);

  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return (
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
          <h1 className="text-xl font-semibold">Too many requests</h1>
          <p className="mt-2 text-sm text-muted">
            Please wait a moment and try again.
            {result.retryAfterMs
              ? ` Retry in about ${Math.ceil(result.retryAfterMs / 1000)}s.`
              : null}
          </p>
        </div>
      );
    }
    notFound();
  }

  const { view } = result;

  return (
    <div className="min-h-full bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            ArcInvoice Pro
          </p>
          <ArcTestnetBadge className="mt-1" />
        </div>
        <ConnectWalletButton />
      </div>
      <PublicInvoiceDocument view={view} token={decoded} />
      <div className="mx-auto max-w-3xl">
        <PaymentPreparePanel
          publicToken={decoded}
          invoiceNumber={view.invoiceNumber}
          status={view.status}
          amountDue={view.amountDue}
          currency={view.currency}
          tokenDecimals={view.tokenDecimals}
          memo={view.memo}
          merchantWallet={view.merchant.walletAddress}
          allowPartialPayments={view.allowPartialPayments}
        />
      </div>
      <LinkCopiedAudit invoiceNumber={view.invoiceNumber} token={token} />
    </div>
  );
}
