import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  icon?: ReactNode;
  /** When true, marks values as non-production demo data. */
  demo?: boolean;
  className?: string;
};

const trendColor = {
  up: "text-success",
  down: "text-danger",
  neutral: "text-muted",
};

export function MetricCard({
  label,
  value,
  hint,
  trend,
  trendTone = "neutral",
  icon,
  demo = false,
  className,
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-muted">{label}</p>
            {demo ? (
              <span className="rounded-full border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted uppercase">
                Demo data
              </span>
            ) : null}
          </div>
        </div>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface-sunken text-muted">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
          {value}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {trend ? (
            <span className={cn("font-medium", trendColor[trendTone])}>
              {trend}
            </span>
          ) : null}
          {hint ? <span className="text-muted">{hint}</span> : null}
        </div>
      </div>
    </article>
  );
}
