import { generatePublicToken, hashPublicToken } from "@/lib/security/tokens";

/**
 * Cryptographically random public payment / receipt token (URL-safe).
 * Uniqueness is enforced at the database layer (raw + hash indexes).
 */
export function generatePublicPaymentToken(bytes = 32): string {
  return generatePublicToken(bytes);
}

export function hashToken(token: string): string {
  return hashPublicToken(token);
}

export { generatePublicToken, hashPublicToken };
