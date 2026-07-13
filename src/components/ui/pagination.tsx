import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  className?: string;
};

export function Pagination({
  page,
  pageCount,
  hrefForPage,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className={cn("flex items-center justify-between gap-3", className)}
      aria-label="Pagination"
    >
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        className={cn(
          "rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium",
          page <= 1 && "pointer-events-none opacity-40",
        )}
        aria-disabled={page <= 1}
      >
        Previous
      </Link>
      <span className="text-sm text-muted">
        Page {page} of {pageCount}
      </span>
      <Link
        href={hrefForPage(Math.min(pageCount, page + 1))}
        className={cn(
          "rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium",
          page >= pageCount && "pointer-events-none opacity-40",
        )}
        aria-disabled={page >= pageCount}
      >
        Next
      </Link>
    </nav>
  );
}
