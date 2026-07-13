"use client";

import { useAccount, useBalance } from "wagmi";
import { Alert } from "@/components/ui/alert";
import {
  ARC_NATIVE_DECIMALS,
  getArcFaucetUrl,
  getArcNetworkLabel,
  isArcTestnetChainId,
} from "@/lib/arc/chain";
import { formatNativeUsdc, nativeUsdc } from "@/lib/arc/units";

/**
 * Reads connected wallet native Arc USDC balance (18 decimals).
 * Never displays ETH as gas.
 */
export function BalanceCard() {
  const { address, isConnected, chainId } = useAccount();
  const onArc = isArcTestnetChainId(chainId);

  const { data, isLoading, isError, error, refetch, isFetching } = useBalance({
    address,
    chainId: onArc ? chainId : undefined,
    query: {
      enabled: Boolean(isConnected && address && onArc),
    },
  });

  if (!isConnected) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-xs">
        <p className="text-xs font-medium text-muted">Wallet balance</p>
        <p className="mt-1 text-sm text-muted">Connect a wallet to view USDC.</p>
      </div>
    );
  }

  if (!onArc) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-xs">
        <p className="text-xs font-medium text-muted">Wallet balance</p>
        <p className="mt-1 text-sm text-warning">
          Switch to {getArcNetworkLabel()} to load native USDC balance.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-xs"
      data-testid="balance-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted">
            Native balance ({getArcNetworkLabel()})
          </p>
          {isLoading || isFetching ? (
            <p className="mt-1 text-sm text-muted">Loading USDC…</p>
          ) : isError ? (
            <p className="mt-1 text-sm text-danger">
              RPC unavailable
              {error?.message ? `: ${error.message}` : ""}
            </p>
          ) : data ? (
            <p className="mt-1 font-mono text-lg font-semibold">
              {formatNativeUsdc(nativeUsdc(data.value))}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Balance unavailable</p>
          )}
        </div>
        <button
          type="button"
          className="text-xs font-medium text-accent hover:underline"
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Displayed as USDC (native gas, {ARC_NATIVE_DECIMALS} decimals). Testnet
        USDC has <strong>no real-world value</strong>.
      </p>
      <a
        href={getArcFaucetUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-medium text-accent underline"
        data-testid="faucet-link"
      >
        Get testnet USDC from Circle faucet
      </a>
      {isError ? (
        <Alert tone="error" className="mt-3">
          Could not reach Arc RPC. Check NEXT_PUBLIC_ARC_RPC_URL or try again.
        </Alert>
      ) : null}
    </div>
  );
}
