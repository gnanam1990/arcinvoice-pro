import { cn } from "@/lib/utils";

export type NetworkId = "arc-testnet" | "arc-mainnet" | "demo";

const networks: Record<
  NetworkId,
  { name: string; short: string; tone: string }
> = {
  "arc-testnet": {
    name: "Arc Testnet",
    short: "Testnet",
    tone: "text-info bg-info-muted border-info/20",
  },
  "arc-mainnet": {
    name: "Arc Mainnet",
    short: "Mainnet",
    tone: "text-accent bg-accent-muted border-accent/20",
  },
  demo: {
    name: "Demo Network",
    short: "Demo",
    tone: "text-muted-foreground bg-surface-sunken border-border",
  },
};

type NetworkBadgeProps = {
  network?: NetworkId;
  className?: string;
  compact?: boolean;
};

/**
 * Presentational network indicator only — no chain switching or RPC logic.
 */
export function NetworkBadge({
  network = "demo",
  className,
  compact = false,
}: NetworkBadgeProps) {
  const meta = networks[network];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-2.5 py-1 text-xs font-medium",
        meta.tone,
        className,
      )}
      title={meta.name}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
        aria-hidden
      />
      <span className="font-mono tracking-tight">
        {compact ? meta.short : meta.name}
      </span>
    </span>
  );
}
