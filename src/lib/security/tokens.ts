import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** High-entropy public token (32 bytes → ~43 char base64url). */
export function generatePublicToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** SHA-256 hex digest for indexed lookup without relying on raw equality alone. */
export function hashPublicToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Constant-time string compare for equal-length secrets.
 * Returns false when lengths differ (after a dummy compare to reduce timing skew).
 */
export function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Dummy compare to keep work roughly constant for short mismatches
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function tokensMatch(provided: string, stored: string): boolean {
  return safeEqualString(hashPublicToken(provided), hashPublicToken(stored));
}
