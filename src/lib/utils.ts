import type { ClassValue } from "./types";

/**
 * Join class names, omitting falsy values.
 * Lightweight helper — no external class utilities required.
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === "string") return [input];
      if (Array.isArray(input)) return input.filter(Boolean) as string[];
      return Object.entries(input)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    })
    .join(" ");
}
