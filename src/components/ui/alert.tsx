import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertProps = {
  tone?: "error" | "success" | "warning" | "info";
  title?: string;
  children: ReactNode;
  className?: string;
};

const tones = {
  error: "border-danger/30 bg-danger-muted text-danger",
  success: "border-success/30 bg-success-muted text-success",
  warning: "border-warning/30 bg-warning-muted text-warning",
  info: "border-info/30 bg-info-muted text-info",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-lg)] border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title && "mt-1")}>{children}</div>
    </div>
  );
}
