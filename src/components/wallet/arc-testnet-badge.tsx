import { NetworkBadge } from "@/components/ui/network-badge";
import { getArcNetworkLabel } from "@/lib/arc/chain";
import { cn } from "@/lib/utils";

/** Persistent Arc Testnet indicator for public + app chrome. */
export function ArcTestnetBadge({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <NetworkBadge network="arc-testnet" />
      <span className="text-[11px] text-muted">
        {getArcNetworkLabel()} · native gas USDC
      </span>
    </div>
  );
}
