import { randomBytes } from "node:crypto";

/**
 * Cryptographically random public payment token (URL-safe).
 * Uniqueness is enforced at the database layer.
 */
export function generatePublicPaymentToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
