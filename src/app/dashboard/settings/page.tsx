import { PageHeader } from "@/components/ui/page-header";
import { MerchantWalletForm } from "@/components/settings/merchant-wallet-form";
import { ArcTestnetBadge } from "@/components/wallet/arc-testnet-badge";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { getActiveOrganization } from "@/lib/org/context";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  let org: Awaited<ReturnType<typeof getActiveOrganization>> | null = null;
  let error: unknown = null;
  try {
    org = await getActiveOrganization();
  } catch (err) {
    error = err;
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <OrgUnavailable error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={org.name}
        title="Organization settings"
        description="Configure Arc Testnet payout wallet. Issued invoices freeze the wallet at issue time."
      />
      <ArcTestnetBadge />
      <div className="max-w-xl rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Merchant Arc payout wallet</h2>
        <MerchantWalletForm />
      </div>
    </div>
  );
}
