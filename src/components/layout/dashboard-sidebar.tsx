"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { NetworkBadge } from "@/components/ui/network-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type NavItemConfig = {
  href: string;
  label: string;
  icon: () => ReactNode;
  match?: "exact" | "prefix";
};

const primaryNav: NavItemConfig[] = [
  { href: "/dashboard", label: "Overview", icon: OverviewIcon, match: "exact" },
  { href: "/dashboard#invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/dashboard#customers", label: "Customers", icon: CustomersIcon },
  { href: "/dashboard#payments", label: "Payments", icon: PaymentsIcon },
];

const secondaryNav: NavItemConfig[] = [
  { href: "/dashboard#settings", label: "Settings", icon: SettingsIcon },
  { href: "/", label: "Marketing site", icon: HomeIcon, match: "exact" },
];

type DashboardSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebar({
  onNavigate,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full min-h-full w-[var(--sidebar-width)] flex-col border-r border-border bg-surface",
        className,
      )}
    >
      <div className="flex h-[var(--nav-height)] items-center border-b border-border px-4">
        <Logo href="/dashboard" />
      </div>

      <nav
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5"
        aria-label="Dashboard"
      >
        <NavGroup title="Workspace">
          {primaryNav.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon />}
              active={isActive(pathname, item)}
              onClick={onNavigate}
            />
          ))}
        </NavGroup>

        <NavGroup title="More">
          {secondaryNav.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon />}
              active={isActive(pathname, item)}
              onClick={onNavigate}
            />
          ))}
        </NavGroup>
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <NetworkBadge network="demo" compact />
          <StatusBadge tone="offline" label="No wallet" />
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          UI shell only. Wallet connection and Arc transactions are not wired
          yet.
        </p>
      </div>
    </aside>
  );
}

function isActive(pathname: string, item: NavItemConfig): boolean {
  if (item.href.includes("#")) return false;
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 rounded-[var(--radius-lg)] px-2.5 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent-muted text-accent"
            : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <span className="opacity-80" aria-hidden>
          {icon}
        </span>
        {label}
      </Link>
    </li>
  );
}

function OverviewIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2-1.5-3.5-4-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M2.5 10h19" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  );
}
