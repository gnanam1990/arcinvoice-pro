import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicInvoiceDocument } from "@/components/public/public-invoice-view";
import { PrintTrigger } from "@/components/public/print-trigger";
import { loadPublicInvoice } from "@/lib/public/load-public-invoice";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = await loadPublicInvoice(token);
  if (!result.ok) {
    return { title: "Invoice print", robots: { index: false, follow: false } };
  }
  return {
    title: `Print ${result.view.invoiceNumber}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicPayPrintPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const result = await loadPublicInvoice(decoded);

  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return (
        <div className="p-8">
          <h1 className="text-lg font-semibold">Too many requests</h1>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="min-h-full bg-white text-black print:bg-white">
      <div className="mx-auto max-w-[210mm] px-4 py-6 print:px-0 print:py-0">
        <PrintTrigger />
        <PublicInvoiceDocument
          view={result.view}
          token={decoded}
          mode="print"
        />
      </div>
    </div>
  );
}
