import { cn } from "@/lib/utils";

export type StatusTone = "online" | "offline" | "pending" | "success" | "warning" | "danger" | "neutral";

const toneStyles: Record<
  StatusTone,
  { dot: string; chip: string; label: string }
> = {
  online: {
    dot: "bg-status-online",
    chip: "bg-success-muted text-success",
    label: "Online",
  },
  offline: {
    dot: "bg-status-offline",
    chip: "bg-surface-sunken text-muted",
    label: "Offline",
  },
  pending: {
    dot: "bg-status-pending",
    chip: "bg-warning-muted text-warning",
    label: "Pending",
  },
  success: {
    dot: "bg-success",
    chip: "bg-success-muted text-success",
    label: "Success",
  },
  warning: {
    dot: "bg-warning",
    chip: "bg-warning-muted text-warning",
    label: "Warning",
  },
  danger: {
    dot: "bg-danger",
    chip: "bg-danger-muted text-danger",
    label: "Error",
  },
  neutral: {
    dot: "bg-muted",
    chip: "bg-surface-sunken text-muted-foreground",
    label: "Unknown",
  },
};

type StatusBadgeProps = {
  tone?: StatusTone;
  label?: string;
  showDot?: boolean;
  className?: string;
  pulse?: boolean;
};

export function StatusBadge({
  tone = "neutral",
  label,
  showDot = true,
  className,
  pulse = false,
}: StatusBadgeProps) {
  const styles = toneStyles[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles.chip,
        className,
      )}
    >
      {showDot ? (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && tone === "online" ? (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
                styles.dot,
              )}
            />
          ) : null}
          <span
            className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", styles.dot)}
          />
        </span>
      ) : null}
      {label ?? styles.label}
    </span>
  );
}
