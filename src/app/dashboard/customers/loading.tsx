export default function CustomersLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading customers">
      <div className="h-8 w-48 rounded bg-surface-sunken" />
      <div className="h-10 w-full rounded bg-surface-sunken" />
      <div className="h-64 w-full rounded bg-surface-sunken" />
    </div>
  );
}
