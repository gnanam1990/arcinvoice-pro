"use client";

import { useMemo, useState, useTransition } from "react";
import { useAccount } from "wagmi";
import { preparePaymentAction } from "@/app/actions/payment-intents";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { NetworkGuard } from "@/components/wallet/network-guard";
import { BalanceCard } from "@/components/wallet/balance-card";
import { ArcTestnetBadge } from "@/components/wallet/arc-testnet-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { isArcTestnetChainId } from "@/lib/arc/chain";
import type { PublicPaymentIntentView } from "@/repositories/payment-intents";
import { parseMoneyToBaseUnits } from "@/lib/money/parse";

type PaymentPreparePanelProps = {
  publicToken: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  currency: string;
  tokenDecimals: number;
  memo?: string | null;
  merchantWallet: string | null;
  allowPartialPayments: boolean;
};

const PAYABLE = new Set(["issued", "partially_paid", "overdue"]);

export function PaymentPreparePanel({
  publicToken,
  invoiceNumber,
  status,
  amountDue,
  currency,
  tokenDecimals,
  merchantWallet,
  allowPartialPayments,
}: PaymentPreparePanelProps) {
  const { address, isConnected, chainId } = useAccount();
  const onArc = isArcTestnetChainId(chainId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<PublicPaymentIntentView | null>(null);
  const [step, setStep] = useState<"form" | "review">("form");
  const [amountDisplay, setAmountDisplay] = useState(() =>
    formatMoney(amountDue, currency, tokenDecimals).replace(`${currency} `, ""),
  );
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const blockedReason = useMemo(() => {
    if (!PAYABLE.has(status)) {
      return `This invoice (${status}) cannot prepare a new payment.`;
    }
    if (!merchantWallet) {
      return "Merchant payout wallet is not configured for this invoice.";
    }
    if (amountDue <= 0) {
      return "Nothing is due on this invoice.";
    }
    return null;
  }, [status, merchantWallet, amountDue]);

  function prepare() {
    setError(null);
    if (!address) {
      setError("Connect a wallet first.");
      return;
    }
    if (!onArc) {
      setError("Switch to Arc Testnet before preparing payment.");
      return;
    }
    if (blockedReason) {
      setError(blockedReason);
      return;
    }

    let requestedAmount: number;
    try {
      requestedAmount = parseMoneyToBaseUnits(amountDisplay, tokenDecimals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid amount");
      return;
    }

    startTransition(async () => {
      const result = await preparePaymentAction({
        publicToken,
        payerAddress: address,
        idempotencyKey,
        requestedAmount,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIntent(result.data);
      setStep("review");
    });
  }

  if (blockedReason && !intent) {
    return (
      <section
        className="mt-8 space-y-3 rounded-[var(--radius-2xl)] border border-border bg-surface p-5 shadow-sm"
        data-testid="payment-prepare-panel"
      >
        <h2 className="text-sm font-semibold">Payment preparation</h2>
        <Alert
          tone={status === "paid" ? "success" : "warning"}
          data-testid="payment-blocked"
        >
          {blockedReason}
        </Alert>
      </section>
    );
  }

  return (
    <section
      className="mt-8 space-y-4 rounded-[var(--radius-2xl)] border border-border bg-surface p-5 shadow-sm"
      data-testid="payment-prepare-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Payment preparation</h2>
        <ArcTestnetBadge />
      </div>

      <p className="text-xs text-muted">
        This step only prepares a payment intent on the server. No transaction
        is signed or broadcast. The button is intentionally labeled{" "}
        <strong>Prepare payment</strong> — not Pay.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <ConnectWalletButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BalanceCard />
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface-sunken p-4 text-sm">
          <p className="text-xs font-medium text-muted">Invoice</p>
          <p className="mt-1 font-mono font-semibold">{invoiceNumber}</p>
          <p className="mt-3 text-xs text-muted">Amount due</p>
          <p className="font-mono">
            {formatMoney(amountDue, currency, tokenDecimals)}
          </p>
        </div>
      </div>

      <NetworkGuard>
        {step === "form" ? (
          <div className="space-y-4">
            {!merchantWallet ? (
              <Alert tone="warning" data-testid="missing-merchant-wallet">
                Missing merchant payout wallet snapshot.
              </Alert>
            ) : null}

            <div>
              <Label htmlFor="pay-amount">
                Amount to prepare ({currency}, major units)
              </Label>
              <Input
                id="pay-amount"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
                disabled={!allowPartialPayments}
                data-testid="prepare-amount"
              />
              {!allowPartialPayments ? (
                <p className="mt-1 text-xs text-muted">
                  Partial payments are disabled for this invoice.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  Partial preparation is allowed up to the amount due.
                </p>
              )}
            </div>

            {error ? (
              <Alert tone="error" data-testid="prepare-error">
                {error}
              </Alert>
            ) : null}

            <Button
              type="button"
              disabled={
                pending || !isConnected || !onArc || !merchantWallet
              }
              onClick={prepare}
              data-testid="prepare-payment"
            >
              {pending ? "Preparing…" : "Prepare payment"}
            </Button>
          </div>
        ) : intent ? (
          <div className="space-y-4" data-testid="prepare-review">
            {intent.status === "expired" ? (
              <Alert tone="warning" data-testid="expired-intent">
                This payment intent has expired. Prepare a new one.
              </Alert>
            ) : (
              <Alert tone="success">
                Payment intent ready — review details below. Signing is not
                enabled yet.
              </Alert>
            )}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Recipient</dt>
                <dd className="break-all font-mono text-xs">
                  {intent.recipientAddress}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Amount</dt>
                <dd className="font-mono font-semibold">
                  {formatMoney(
                    intent.amount,
                    intent.currency,
                    intent.tokenDecimals,
                  )}{" "}
                  ({intent.asset})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Network</dt>
                <dd>
                  {intent.networkLabel} · chain {intent.chainId}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Invoice</dt>
                <dd className="font-mono">{intent.invoiceNumber}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Memo</dt>
                <dd>{intent.memo ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Estimated gas context</dt>
                <dd className="text-xs text-muted">{intent.estimatedGasNote}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="font-medium capitalize">{intent.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Expires</dt>
                <dd className="font-mono text-xs">
                  {new Date(intent.expiresAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep("form");
                  setIntent(null);
                }}
              >
                Back
              </Button>
              <Button type="button" size="sm" disabled title="Coming soon">
                Pay (unavailable)
              </Button>
            </div>
          </div>
        ) : null}
      </NetworkGuard>
    </section>
  );
}
