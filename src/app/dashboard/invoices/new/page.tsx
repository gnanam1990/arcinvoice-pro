import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadNewInvoice } from "@/lib/dashboard-data";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const loaded = await loadNewInvoice();
  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Create invoice" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoices"
        title="Create invoice"
        description="Multi-step draft: customer, line items, dates, then review. All money is integer base units."
      />
      <InvoiceForm mode="create" customers={loaded.customers} />
    </div>
  );
}
