"use client";

export function PrintTrigger() {
  return (
    <div className="mb-4 flex justify-end print:hidden">
      <button
        type="button"
        className="rounded-[var(--radius-lg)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm"
        onClick={() => window.print()}
        data-testid="print-invoice-button"
      >
        Print invoice
      </button>
    </div>
  );
}
