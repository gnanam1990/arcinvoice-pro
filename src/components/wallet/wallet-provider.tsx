"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { WagmiProvider, type State } from "wagmi";
import { wagmiConfig } from "@/lib/wallet/config";
import { hasInjectedWalletProvider } from "@/lib/wallet/detect-provider";

type WalletProviderProps = {
  children: ReactNode;
  initialState?: State;
};

/**
 * Client-only Wagmi + React Query tree.
 * reconnectOnMount is disabled when no injected/EIP-6963 provider exists
 * so we never auto-connect into "Provider not found".
 */
export function WalletProvider({ children, initialState }: WalletProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );

  const canReconnect = useSyncExternalStore(
    subscribeProviderPresence,
    hasInjectedWalletProvider,
    () => false,
  );

  return (
    <WagmiProvider
      config={wagmiConfig}
      initialState={initialState}
      reconnectOnMount={canReconnect}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

function subscribeProviderPresence(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  // EIP-6963 announcements
  const onAnnounce = () => onStoreChange();
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  // Request providers to announce
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {
    // ignore
  }

  // ethereum may be injected asynchronously
  const interval = window.setInterval(() => {
    if (hasInjectedWalletProvider()) {
      onStoreChange();
      window.clearInterval(interval);
    }
  }, 500);

  const timeout = window.setTimeout(() => window.clearInterval(interval), 5000);

  return () => {
    window.removeEventListener("eip6963:announceProvider", onAnnounce);
    window.clearInterval(interval);
    window.clearTimeout(timeout);
  };
}
