import { AmountError } from "@/lib/domain/amounts";
import {
  ARC_ERC20_USDC_DECIMALS,
  ARC_NATIVE_DECIMALS,
} from "@/lib/arc/chain";

export type UnitSystem = "native_usdc_18" | "erc20_usdc_6" | "invoice_base";

/**
 * Strict unit types so native (18) and ERC-20 (6) cannot be mixed accidentally.
 */
export type NativeUsdcAmount = {
  readonly system: "native_usdc_18";
  readonly value: bigint;
};

export type Erc20UsdcAmount = {
  readonly system: "erc20_usdc_6";
  readonly value: bigint;
};

/** Invoice money already uses integer base units (typically 2 for display USD). */
export type InvoiceBaseAmount = {
  readonly system: "invoice_base";
  readonly value: number;
  readonly decimals: number;
};

export function nativeUsdc(value: bigint): NativeUsdcAmount {
  return { system: "native_usdc_18", value };
}

export function erc20Usdc(value: bigint): Erc20UsdcAmount {
  return { system: "erc20_usdc_6", value };
}

export function assertSameSystem<T extends { system: string }>(
  a: T,
  b: T,
  op: string,
): void {
  if (a.system !== b.system) {
    throw new AmountError(
      `Cannot ${op} amounts from different unit systems (${a.system} vs ${b.system})`,
    );
  }
}

export function addNative(a: NativeUsdcAmount, b: NativeUsdcAmount): NativeUsdcAmount {
  assertSameSystem(a, b, "add");
  return nativeUsdc(a.value + b.value);
}

export function addErc20(a: Erc20UsdcAmount, b: Erc20UsdcAmount): Erc20UsdcAmount {
  assertSameSystem(a, b, "add");
  return erc20Usdc(a.value + b.value);
}

/** Reject cross-system arithmetic at the type/runtime boundary. */
export function rejectMixedUnits(
  a: { system: string },
  b: { system: string },
): never | void {
  if (a.system !== b.system) {
    throw new AmountError(
      `Illegal mix of unit systems: ${a.system} and ${b.system}`,
    );
  }
}

/**
 * Format bigint base units for display without floating-point math.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  options?: { maxFractionDigits?: number },
): string {
  if (decimals < 0 || decimals > 36) {
    throw new AmountError("decimals out of range");
  }
  const zero = BigInt(0);
  const ten = BigInt(10);
  const negative = amount < zero;
  const abs = negative ? -amount : amount;
  const base = ten ** BigInt(decimals);
  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, "0");

  const maxFrac = options?.maxFractionDigits;
  if (maxFrac !== undefined && maxFrac >= 0 && maxFrac < fraction.length) {
    fraction = fraction.slice(0, maxFrac);
  }
  fraction = fraction.replace(/0+$/, "");

  const body =
    fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return negative ? `-${body}` : body;
}

export function formatNativeUsdc(amount: NativeUsdcAmount): string {
  return `${formatTokenAmount(amount.value, ARC_NATIVE_DECIMALS, {
    maxFractionDigits: 6,
  })} USDC`;
}

export function formatErc20Usdc(amount: Erc20UsdcAmount): string {
  return `${formatTokenAmount(amount.value, ARC_ERC20_USDC_DECIMALS)} USDC`;
}

/**
 * Convert invoice base units (e.g. cents, 2 decimals) to ERC-20 USDC (6 decimals).
 * Does not touch native 18-decimal balances.
 */
export function invoiceBaseToErc20Usdc(
  invoiceAmount: InvoiceBaseAmount,
): Erc20UsdcAmount {
  if (invoiceAmount.decimals < 0 || invoiceAmount.decimals > 18) {
    throw new AmountError("invoice decimals out of range");
  }
  if (!Number.isInteger(invoiceAmount.value) || invoiceAmount.value < 0) {
    throw new AmountError("invoice amount must be a non-negative integer");
  }
  const scale = ARC_ERC20_USDC_DECIMALS - invoiceAmount.decimals;
  if (scale < 0) {
    throw new AmountError(
      "invoice decimals cannot exceed ERC-20 USDC decimals (6)",
    );
  }
  const factor = BigInt(10) ** BigInt(scale);
  return erc20Usdc(BigInt(invoiceAmount.value) * factor);
}

/**
 * Convert invoice base units to native USDC 18-decimal units for comparison only.
 * Never use this to send ERC-20 transfers.
 */
export function invoiceBaseToNativeUsdc(
  invoiceAmount: InvoiceBaseAmount,
): NativeUsdcAmount {
  if (invoiceAmount.decimals < 0 || invoiceAmount.decimals > 18) {
    throw new AmountError("invoice decimals out of range");
  }
  if (!Number.isInteger(invoiceAmount.value) || invoiceAmount.value < 0) {
    throw new AmountError("invoice amount must be a non-negative integer");
  }
  const scale = ARC_NATIVE_DECIMALS - invoiceAmount.decimals;
  const factor = BigInt(10) ** BigInt(scale);
  return nativeUsdc(BigInt(invoiceAmount.value) * factor);
}

export function parseTokenAmountToBigInt(
  display: string,
  decimals: number,
): bigint {
  const trimmed = display.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new AmountError("Invalid token amount");
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new AmountError(`At most ${decimals} decimal places allowed`);
  }
  const padded = frac.padEnd(decimals, "0");
  const combined = `${whole}${padded}`.replace(/^0+(?=\d)/, "") || "0";
  return BigInt(combined);
}
