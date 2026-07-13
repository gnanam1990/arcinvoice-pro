"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { NetworkBadge } from "@/components/ui/network-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { isArcTestnetChainId } from "@/lib/arc/chain";
import {
  hasInjectedWalletProvider,
  isProviderNotFoundError,
  isUserRejectionError,
} from "@/lib/wallet/detect-provider";
import { cn } from "@/lib/utils";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type ConnectWalletButtonProps = {
  className?: string;
  showNetwork?: boolean;
};

/**
 * Reusable injected-wallet connect control (Wagmi React hooks only).
 * Detects no-wallet before connect; never auto-connects without a provider.
 */
export function ConnectWalletButton({
  className,
  showNetwork = true,
}: ConnectWalletButtonProps) {
  const { address, isConnected, isConnecting, isReconnecting, status, chainId } =
    useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [localError, setLocalError] = useState<string | null>(null);
  const [noWalletHint, setNoWalletHint] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const hasProvider = useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const onAnnounce = () => onChange();
      window.addEventListener("eip6963:announceProvider", onAnnounce);
      try {
        window.dispatchEvent(new Event("eip6963:requestProvider"));
      } catch {
        // ignore
      }
      return () =>
        window.removeEventListener("eip6963:announceProvider", onAnnounce);
    },
    hasInjectedWalletProvider,
    () => false,
  );

  const injectedConnector =
    connectors.find((c) => c.id === "injected" || c.type === "injected") ??
    connectors[0];

  const handleConnect = useCallback(async () => {
    setLocalError(null);
    setNoWalletHint(false);

    // Detect no-wallet before calling connect (avoids Provider not found)
    if (!hasInjectedWalletProvider()) {
      setNoWalletHint(true);
      setLocalError(null);
      return;
    }

    if (!injectedConnector) {
      setNoWalletHint(true);
      return;
    }

    try {
      await connectAsync({ connector: injectedConnector });
    } catch (err) {
      // Prevent uncaught promise rejections
      if (isUserRejectionError(err)) {
        setLocalError("Connection cancelled in wallet.");
        setNoWalletHint(false);
        return;
      }
      if (isProviderNotFoundError(err)) {
        setNoWalletHint(true);
        setLocalError(null);
        return;
      }
      const message =
        err instanceof Error ? err.message : "Could not connect wallet.";
      setLocalError(message);
    }
  }, [connectAsync, injectedConnector]);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled
      >
        Connect wallet
      </Button>
    );
  }

  const onArc = isArcTestnetChainId(chainId);
  const busy = isConnecting || isReconnecting || isPending;

  if (isConnected && address) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {showNetwork ? (
          onArc ? (
            <NetworkBadge network="arc-testnet" compact />
          ) : (
            <StatusBadge tone="warning" label="Wrong network" />
          )
        ) : null}
        <span className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-border bg-surface px-3 py-1.5 text-sm shadow-xs">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "connected" ? "bg-status-online" : "bg-status-pending",
            )}
            aria-hidden
          />
          <span className="font-mono text-xs">{truncateAddress(address)}</span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              disconnect();
            } catch {
              // ignore disconnect errors
            }
          }}
          data-testid="disconnect-wallet"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  if (!hasProvider || noWalletHint) {
    return (
      <div
        className={cn("flex max-w-sm flex-col gap-2", className)}
        data-testid="no-wallet-detected"
      >
        <Button type="button" size="sm" variant="outline" disabled>
          No wallet detected
        </Button>
        <p className="text-xs leading-relaxed text-muted" role="status">
          Install a browser wallet extension such as{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline"
          >
            MetaMask
          </a>{" "}
          (or another EIP-6963 wallet), then refresh this page to connect.
        </p>
        {hasProvider ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setNoWalletHint(false);
              void handleConnect();
            }}
          >
            Try connect again
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        size="sm"
        disabled={busy || !injectedConnector}
        onClick={() => void handleConnect()}
        data-testid="connect-wallet"
      >
        {busy ? "Connecting…" : "Connect wallet"}
      </Button>
      {localError ? (
        <p className="text-xs text-danger" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
