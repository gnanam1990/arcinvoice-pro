"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WalletBadge } from "@/components/ui/wallet-badge";
import { NetworkBadge } from "@/components/ui/network-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type DashboardTopbarProps = {
  onMenuClick?: () => void;
  className?: string;
};

export function DashboardTopbar({
  onMenuClick,
  className,
}: DashboardTopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-[var(--nav-height)] items-center justify-between gap-3 border-b border-border bg-background/85 px-[var(--page-gutter)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface lg:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar navigation"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M4 7h16M4 12h12M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-foreground">
            Workspace
          </p>
          <p className="truncate text-xs text-muted">Invoice operations</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge
          tone="pending"
          label="Scaffold"
          className="hidden md:inline-flex"
        />
        <NetworkBadge network="demo" compact className="hidden sm:inline-flex" />
        <ThemeToggle />
        <WalletBadge />
      </div>
    </header>
  );
}
