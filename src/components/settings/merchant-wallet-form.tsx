"use client";

import { useEffect, useState, useTransition } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  getMerchantWalletSettingsAction,
  updateMerchantWalletAction,
} from "@/app/actions/merchant-wallet";
import { buildMerchantWalletMessage } from "@/lib/merchant/wallet-message";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { normalizeAddress, isValidEvmAddress } from "@/lib/arc/addresses";

export function MerchantWalletForm() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [pending, startTransition] = useTransition();
  const [walletInput, setWalletInput] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [issuedCount, setIssuedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const result = await getMerchantWalletSettingsAction();
      if (result.ok) {
        setCurrent(result.data.walletAddress);
        setWalletInput(result.data.walletAddress ?? "");
        setOrgId(result.data.organizationId);
        setIssuedCount(result.data.issuedInvoiceCount);
      }
    });
  }, []);

  function useConnected() {
    if (address) {
      try {
        setWalletInput(normalizeAddress(address));
      } catch {
        setWalletInput(address);
      }
    }
  }

  function requestSave() {
    setError(null);
    setSuccess(null);
    if (!isValidEvmAddress(walletInput)) {
      setError("Enter a valid EVM address");
      return;
    }
    if (issuedCount > 0) {
      setConfirmOpen(true);
      return;
    }
    save();
  }

  function save() {
    setConfirmOpen(false);
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (!isConnected || !address) {
        setError("Connect the payout wallet to sign the confirmation.");
        return;
      }

      let checksummed: string;
      try {
        checksummed = normalizeAddress(walletInput);
      } catch {
        setError("Invalid EVM address");
        return;
      }

      if (normalizeAddress(address) !== checksummed) {
        setError(
          "Connected wallet must match the payout address you are setting.",
        );
        return;
      }

      const timestamp = new Date().toISOString();
      const message = buildMerchantWalletMessage({
        organizationId: orgId,
        walletAddress: checksummed,
        timestamp,
      });

      let signature: string;
      try {
        signature = await signMessageAsync({ message });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          msg.toLowerCase().includes("reject")
            ? "Signature rejected in wallet."
            : msg,
        );
        return;
      }

      const result = await updateMerchantWalletAction({
        walletAddress: checksummed,
        signature,
        message,
        signedBy: address,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCurrent(result.data.walletAddress);
      setWalletInput(result.data.walletAddress);
      setSuccess(
        result.data.issuedInvoiceWarning
          ? `Wallet updated. ${result.data.issuedInvoiceCount} issued invoice(s) keep their original payout snapshot.`
          : "Merchant payout wallet updated.",
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ConnectWalletButton />
      </div>

      {issuedCount > 0 ? (
        <Alert tone="warning">
          {issuedCount} issued invoice(s) already exist. Changing the merchant
          wallet will <strong>not</strong> update their frozen payout snapshots.
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div>
        <Label htmlFor="merchant-wallet">Arc payout wallet (EVM)</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="merchant-wallet"
            className="font-mono"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x…"
            data-testid="merchant-wallet-input"
          />
          <Button type="button" variant="outline" onClick={useConnected}>
            Use connected
          </Button>
        </div>
        {current ? (
          <p className="mt-1 text-xs text-muted">
            Current: <span className="font-mono">{current}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">No payout wallet configured.</p>
        )}
      </div>

      <Button
        type="button"
        disabled={pending}
        onClick={requestSave}
        data-testid="save-merchant-wallet"
      >
        {pending ? "Saving…" : "Sign & save payout wallet"}
      </Button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-surface-overlay"
            aria-label="Dismiss"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Change merchant wallet?</h2>
            <p className="mt-2 text-sm text-muted">
              {issuedCount} issued invoice(s) will keep their original payout
              wallet snapshot. New invoices will use the new address.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={save}>
                Continue & sign
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
