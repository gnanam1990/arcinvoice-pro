import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
  showWordmark?: boolean;
};

/**
 * Original ArcInvoice mark — geometric invoice glyph + wordmark.
 * Not an Arc Network logo.
 */
export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)] bg-accent text-accent-foreground shadow-sm"
        aria-hidden
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 2.5h6.2L12.5 5.3V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 2.5V5h2.8"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 8.5h5M5.5 11h3"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            ArcInvoice
          </span>
          <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
            Pro
          </span>
        </span>
      ) : (
        <span className="sr-only">ArcInvoice Pro</span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-[var(--radius-md)] transition-opacity hover:opacity-90"
    >
      {content}
    </Link>
  );
}
