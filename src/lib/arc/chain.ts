import { defineChain } from "viem";

/** Official Arc Testnet chain ID. */
export const ARC_TESTNET_CHAIN_ID = 5042002;

export const DEFAULT_ARC_RPC_URL = "https://rpc.testnet.arc.network";
export const DEFAULT_ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const DEFAULT_ARC_FAUCET_URL = "https://faucet.circle.com";

/**
 * Native gas token is USDC on Arc Testnet — never ETH.
 * Native balance uses 18 decimals (EVM balance units).
 * ERC-20 USDC interface uses 6 decimals separately.
 */
export const ARC_NATIVE_DECIMALS = 18;
export const ARC_ERC20_USDC_DECIMALS = 6;

export function getArcRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim() ||
    DEFAULT_ARC_RPC_URL
  );
}

export function getArcExplorerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ARC_EXPLORER_URL?.replace(/\/$/, "") ||
    DEFAULT_ARC_EXPLORER_URL
  );
}

export function getArcFaucetUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ARC_FAUCET_URL?.trim() ||
    DEFAULT_ARC_FAUCET_URL
  );
}

export function getArcNetworkLabel(): string {
  return process.env.NEXT_PUBLIC_ARC_NETWORK_LABEL?.trim() || "Arc Testnet";
}

/**
 * Viem/Wagmi chain definition for Arc Testnet.
 * Native currency symbol is USDC (not ETH).
 */
export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: getArcNetworkLabel(),
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: ARC_NATIVE_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [getArcRpcUrl()],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan Testnet",
      url: getArcExplorerUrl(),
    },
  },
  testnet: true,
});

export function isArcTestnetChainId(chainId: number | undefined | null): boolean {
  return chainId === ARC_TESTNET_CHAIN_ID;
}

export function getArcWalletAddParams() {
  return {
    chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
    chainName: getArcNetworkLabel(),
    nativeCurrency: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: ARC_NATIVE_DECIMALS,
    },
    rpcUrls: [getArcRpcUrl()],
    blockExplorerUrls: [getArcExplorerUrl()],
  } as const;
}
