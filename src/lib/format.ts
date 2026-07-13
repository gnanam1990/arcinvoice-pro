import { formatBaseUnits } from "@/lib/domain/amounts";

export function formatMoney(
  amount: number,
  currency = "USD",
  tokenDecimals = 2,
): string {
  const formatted = formatBaseUnits(amount, tokenDecimals);
  return `${currency} ${formatted}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    // date-only strings
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return "—";
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function invoiceStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
