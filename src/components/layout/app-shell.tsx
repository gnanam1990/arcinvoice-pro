"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Reusable authenticated / app chrome: sidebar + top bar + main content.
 * Responsive: collapsible drawer on mobile/tablet, fixed rail on desktop.
 */
export function AppShell({ children, className }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className={cn("flex min-h-full bg-background", className)}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Mobile / tablet drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-surface-overlay"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(100%,var(--sidebar-width))] shadow-lg">
            <DashboardSidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar onMenuClick={() => setMobileNavOpen(true)} />
        <main
          id="main-content"
          className="flex-1 px-[var(--page-gutter)] py-6 sm:py-8 lg:py-10"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
