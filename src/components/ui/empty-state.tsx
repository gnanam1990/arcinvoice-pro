import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-surface px-6 py-14 text-center shadow-xs sm:px-10",
        className,
      )}
      role="status"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-accent-muted text-accent">
        {icon ?? <InvoiceEmptyIcon />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

function InvoiceEmptyIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
