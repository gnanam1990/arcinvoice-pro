"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  ARC_TESTNET_CHAIN_ID,
  getArcNetworkLabel,
  getArcWalletAddParams,
  isArcTestnetChainId,
} from "@/lib/arc/chain";

/**
 * Detects wrong network and offers switch / add Arc Testnet.
 * Uses account.chainId from the wallet (not config default).
 */
export function NetworkGuard({ children }: { children?: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending, error } = useSwitchChain();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isConnected) return children ?? null;
  if (isArcTestnetChainId(chainId)) return children ?? null;

  async function switchOrAdd() {
    setLocalError(null);
    try {
      await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 4902 = unrecognized chain — request wallet to add it
      const needsAdd =
        message.includes("4902") ||
        message.toLowerCase().includes("unrecognized") ||
        message.toLowerCase().includes("not configured");

      if (needsAdd && typeof window !== "undefined") {
        const ethereum = window.ethereum;
        if (!ethereum) {
          setLocalError(
            "No wallet detected. Install a browser wallet, then try again.",
          );
          return;
        }
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [getArcWalletAddParams()],
          });
          await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
          return;
        } catch (addErr) {
          const addMsg =
            addErr instanceof Error ? addErr.message : String(addErr);
          if (
            addMsg.toLowerCase().includes("reject") ||
            addMsg.toLowerCase().includes("denied")
          ) {
            setLocalError("Network switch cancelled in wallet.");
            return;
          }
          setLocalError(addMsg);
          return;
        }
      }

      if (
        message.toLowerCase().includes("reject") ||
        message.toLowerCase().includes("denied")
      ) {
        setLocalError("Network switch cancelled in wallet.");
        return;
      }
      setLocalError(message);
    }
  }

  return (
    <div className="space-y-3" data-testid="wrong-network">
      <Alert tone="warning" title="Wrong network">
        Connect to {getArcNetworkLabel()} (chain {ARC_TESTNET_CHAIN_ID}) to
        prepare payments. Native gas is USDC — never ETH.
      </Alert>
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={switchOrAdd}
        data-testid="switch-network"
      >
        {isPending ? "Switching…" : `Switch to ${getArcNetworkLabel()}`}
      </Button>
      {localError || error ? (
        <p className="text-xs text-danger" role="alert">
          {localError || error?.message}
        </p>
      ) : null}
      {/* Disable payment prep children when wrong network */}
      <div className="pointer-events-none opacity-50" aria-disabled="true">
        {children}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
