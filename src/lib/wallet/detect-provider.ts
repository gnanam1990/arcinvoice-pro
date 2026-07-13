/**
 * Client-only wallet provider detection.
 * Never call during SSR — always guard with typeof window.
 */

export function hasInjectedWalletProvider(): boolean {
  if (typeof window === "undefined") return false;

  // Classic injected provider
  if (window.ethereum) return true;

  // Some wallets expose ethereum on web3
  const w = window as Window & { web3?: { currentProvider?: unknown } };
  if (w.web3?.currentProvider) return true;

  return false;
}

export function isProviderNotFoundError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  const name = error instanceof Error ? error.name : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    name === "ProviderNotFoundError" ||
    code === "PROVIDER_NOT_FOUND" ||
    /provider not found/i.test(message) ||
    /no provider/i.test(message) ||
    /connector not found/i.test(message)
  );
}

export function isUserRejectionError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);
  const name = error instanceof Error ? error.name : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  return (
    name === "UserRejectedRequestError" ||
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    /user rejected/i.test(message) ||
    /user denied/i.test(message) ||
    /rejected the request/i.test(message)
  );
}
