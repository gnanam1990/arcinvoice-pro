"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-surface-overlay"
        aria-label="Dismiss dialog"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-lg">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
            className={cn(loading && "opacity-70")}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
