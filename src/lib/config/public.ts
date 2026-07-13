/**
 * Public-facing configuration (network labels, explorer URLs).
 * No secrets — safe for server components rendering public pages.
 */

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getPublicNetworkLabel(): string {
  return process.env.NEXT_PUBLIC_ARC_NETWORK_LABEL || "Arc Testnet";
}

export function getExplorerTxUrl(txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  const template =
    process.env.NEXT_PUBLIC_EXPLORER_TX_URL ||
    "https://testnet.arcscan.io/tx/{hash}";
  return template.replace("{hash}", encodeURIComponent(txHash));
}

export function getMerchantDefaultWallet(): string | null {
  const w = process.env.NEXT_PUBLIC_MERCHANT_WALLET?.trim();
  return w || null;
}

export function publicInvoicePath(token: string): string {
  return `/pay/${encodeURIComponent(token)}`;
}

export function publicInvoicePrintPath(token: string): string {
  return `/pay/${encodeURIComponent(token)}/print`;
}

export function publicReceiptPath(token: string): string {
  return `/receipt/${encodeURIComponent(token)}`;
}

export function absoluteUrl(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
