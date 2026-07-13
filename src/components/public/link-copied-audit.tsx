"use client";

/**
 * Placeholder hook surface for link-copy analytics from public pages.
 * Actual dashboard audit for "link copied" is recorded from the merchant UI.
 * Public pages intentionally do not log visitor IPs.
 */
export function LinkCopiedAudit({
  invoiceNumber: _invoiceNumber,
  token: _token,
}: {
  invoiceNumber: string;
  token: string;
}) {
  void _invoiceNumber;
  void _token;
  return null;
}
