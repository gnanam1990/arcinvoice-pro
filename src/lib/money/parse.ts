import { AmountError } from "@/lib/domain/amounts";

/**
 * Parse a decimal display string into integer base units.
 * e.g. "12.34" with decimals=2 → 1234
 */
export function parseMoneyToBaseUnits(
  value: string | number,
  tokenDecimals = 2,
): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AmountError("Invalid money amount");
    }
    // Treat number as already major units for convenience in tests only
    const factor = 10 ** tokenDecimals;
    const base = Math.round(value * factor);
    if (!Number.isSafeInteger(base)) {
      throw new AmountError("Amount exceeds safe integer range");
    }
    return base;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new AmountError("Amount is required");
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new AmountError("Amount must be a decimal number");
  }

  const negative = trimmed.startsWith("-");
  const abs = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ""] = abs.split(".");

  if (fracPart.length > tokenDecimals) {
    throw new AmountError(
      `Amount supports at most ${tokenDecimals} decimal places`,
    );
  }

  const paddedFrac = fracPart.padEnd(tokenDecimals, "0");
  const combined = `${wholePart}${paddedFrac}`.replace(/^0+(?=\d)/, "") || "0";
  const base = Number(combined);
  if (!Number.isSafeInteger(base)) {
    throw new AmountError("Amount exceeds safe integer range");
  }
  return negative ? -base : base;
}

/** Safe form helper: empty → 0 */
export function parseMoneyField(
  value: string | undefined | null,
  tokenDecimals = 2,
): number {
  if (value === undefined || value === null || value.trim() === "") {
    return 0;
  }
  return parseMoneyToBaseUnits(value, tokenDecimals);
}
