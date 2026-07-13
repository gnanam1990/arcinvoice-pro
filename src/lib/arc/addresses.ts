import { getAddress, isAddress } from "viem";

export function isValidEvmAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  return isAddress(value, { strict: false });
}

/** Normalize to EIP-55 checksum address. */
export function toChecksumAddress(value: string): string {
  if (!isAddress(value, { strict: false })) {
    throw new Error("Invalid EVM address");
  }
  return getAddress(value);
}

export function normalizeAddress(value: string): string {
  return toChecksumAddress(value);
}

export function addressesEqual(a: string, b: string): boolean {
  try {
    return toChecksumAddress(a) === toChecksumAddress(b);
  } catch {
    return false;
  }
}
