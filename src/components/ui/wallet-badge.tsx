import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type WalletBadgeProps = {
  /** When omitted, shows a disconnected / connect CTA shell (no wallet logic). */
  address?: string | null;
  className?: string;
  onConnectClick?: () => void;
  connectedLabel?: string;
};

function truncateAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Presentational wallet chip / connect shell.
 * Does not implement wallet connection, signing, or providers.
 */
export function WalletBadge({
  address = null,
  className,
  onConnectClick,
  connectedLabel,
}: WalletBadgeProps) {
  if (!address) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("font-medium", className)}
        onClick={onConnectClick}
        aria-label="Connect wallet (coming soon)"
      >
        <WalletIcon className="h-3.5 w-3.5 opacity-70" />
        Connect wallet
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-border bg-surface px-3 py-1.5 text-sm shadow-xs",
        className,
      )}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-muted text-accent"
        aria-hidden
      >
        <WalletIcon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        {connectedLabel ? (
          <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
            {connectedLabel}
          </span>
        ) : null}
        <span className="font-mono text-xs text-foreground">
          {truncateAddress(address)}
        </span>
      </div>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-7z" />
      <path d="M16 12h.01" />
      <path d="M3 10h18" />
    </svg>
  );
}
