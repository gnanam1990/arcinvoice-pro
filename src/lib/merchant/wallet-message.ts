export function buildMerchantWalletMessage(input: {
  organizationId: string;
  walletAddress: string;
  timestamp: string;
}): string {
  return [
    "ArcInvoice Pro — confirm merchant payout wallet",
    `Organization: ${input.organizationId}`,
    `Payout wallet: ${input.walletAddress}`,
    `Timestamp: ${input.timestamp}`,
    "This signature only confirms the address change. No funds are transferred.",
  ].join("\n");
}
