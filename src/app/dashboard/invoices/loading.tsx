export default function InvoicesLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading invoices">
      <div className="h-8 w-48 rounded bg-surface-sunken" />
      <div className="h-10 w-full rounded bg-surface-sunken" />
      <div className="h-64 w-full rounded bg-surface-sunken" />
    </div>
  );
}
