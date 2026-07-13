import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet, getArcRpcUrl } from "@/lib/arc/chain";

/**
 * Wagmi v3 config (React `wagmi` package APIs only).
 * - createConfig + injected() + EIP-6963 multi-provider discovery
 * - Arc Testnet + HTTP transport
 * - SSR-safe cookie storage for reconnect (no private keys)
 *
 * Module singleton so server cookie hydration and client WagmiProvider
 * share the same config instance.
 */
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
      // Prefer async inject shim so late-injected wallets still resolve
      unstable_shimAsyncInject: true,
    }),
  ],
  // Discover EIP-6963 wallets (MetaMask, Rabby, etc.) in addition to window.ethereum
  multiInjectedProviderDiscovery: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [arcTestnet.id]: http(getArcRpcUrl()),
  },
});

/** @deprecated Prefer `wagmiConfig` singleton */
export function createWagmiConfig() {
  return wagmiConfig;
}

export type AppWagmiConfig = typeof wagmiConfig;
