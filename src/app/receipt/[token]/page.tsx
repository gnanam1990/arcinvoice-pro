import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicReceiptDocument } from "@/components/public/public-receipt-view";
import { loadPublicReceipt } from "@/lib/public/load-public-receipt";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await loadPublicReceipt(token);
  if (!result.ok) {
    return {
      title: "Receipt unavailable",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Receipt ${result.view.receiptNumber}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicReceiptPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const result = await loadPublicReceipt(decoded);

  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return (
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
          <h1 className="text-xl font-semibold">Too many requests</h1>
          <p className="mt-2 text-sm text-muted">
            Please wait a moment and try again.
          </p>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="min-h-full bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight">ArcInvoice Pro</p>
        <p className="text-xs text-muted">Secure receipt</p>
      </div>
      <PublicReceiptDocument view={result.view} token={decoded} />
    </div>
  );
}
