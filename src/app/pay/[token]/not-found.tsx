import Link from "next/link";

export default function PayNotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold tracking-tight">Invoice not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This payment link is invalid, expired, or not available for public
        viewing. Draft and cancelled invoices are never shown publicly.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-accent hover:underline"
      >
        Back to ArcInvoice Pro
      </Link>
    </div>
  );
}
