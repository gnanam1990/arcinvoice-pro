import type { ReceiptSnapshot } from "@/db/schema";

export type PublicReceiptView = {
  receiptNumber: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  asset: string;
  tokenDecimals: number;
  network: string;
  networkLabel: string;
  txHash: string | null;
  explorerUrl: string | null;
  finalizedAt: string;
  payerAddress: string | null;
  merchantAddress: string | null;
  memo: string | null;
  remainingBalance: number;
  merchantName: string;
};

export function snapshotToPublicReceipt(
  number: string,
  merchantName: string,
  snapshot: ReceiptSnapshot,
  networkLabel: string,
  explorerUrl: string | null,
): PublicReceiptView {
  return {
    receiptNumber: number,
    invoiceNumber: snapshot.invoiceNumber,
    amount: snapshot.amount,
    currency: snapshot.currency,
    asset: snapshot.asset,
    tokenDecimals: snapshot.tokenDecimals,
    network: snapshot.network,
    networkLabel,
    txHash: snapshot.txHash,
    explorerUrl,
    finalizedAt: snapshot.finalizedAt,
    payerAddress: snapshot.payerAddress,
    merchantAddress: snapshot.merchantAddress,
    memo: snapshot.memo,
    remainingBalance: snapshot.remainingBalance,
    merchantName,
  };
}
