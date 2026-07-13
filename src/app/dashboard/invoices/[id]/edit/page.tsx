import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadInvoiceEdit } from "@/lib/dashboard-data";
import { formatBaseUnits } from "@/lib/domain/amounts";

export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadInvoiceEdit(id);

  if (!loaded.ok) {
    if (loaded.notFound) notFound();
    return (
      <div className="space-y-6">
        <PageHeader title="Edit invoice" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  const { detail, customers } = loaded;
  if (detail.invoice.status !== "draft") {
    redirect(`/dashboard/invoices/${id}`);
  }

  const { invoice, lines } = detail;
  const decimals = invoice.tokenDecimals;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoices"
        title={`Edit ${invoice.number}`}
        description="Only draft invoices can be edited."
      />
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        customers={customers}
        initial={{
          customerId: invoice.customerId ?? undefined,
          currency: invoice.currency,
          tokenDecimals: decimals,
          taxDisplay: formatBaseUnits(invoice.tax, decimals),
          discountDisplay: formatBaseUnits(invoice.discount, decimals),
          issueDate: invoice.issueDate ?? "",
          dueDate: invoice.dueDate ?? "",
          notes: invoice.notes ?? "",
          memo: invoice.memo ?? "",
          lines: lines.map((line) => ({
            key: line.id,
            description: line.description,
            quantity: line.quantity,
            unitPriceDisplay: formatBaseUnits(line.unitPrice, decimals),
          })),
        }}
      />
    </div>
  );
}
