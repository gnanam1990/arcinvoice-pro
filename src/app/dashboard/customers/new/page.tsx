import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="New customer"
        description="Add a billing contact. Email and optional wallet must be unique within the organization."
      />
      <div className="max-w-2xl rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs sm:p-6">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
