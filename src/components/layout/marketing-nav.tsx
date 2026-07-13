"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#features", label: "Features" },
  { href: "/#open-source", label: "Open source" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--nav-height)] w-full max-w-[var(--content-max)] items-center justify-between gap-4 px-[var(--page-gutter)]">
        <div className="flex items-center gap-8">
          <Logo />
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Product"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Dashboard
          </Button>
          <Button href="/dashboard" size="sm" className="hidden sm:inline-flex">
            Launch app
          </Button>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "border-t border-border bg-surface md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav
          className="mx-auto flex max-w-[var(--content-max)] flex-col gap-1 px-[var(--page-gutter)] py-3"
          aria-label="Mobile product"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-sunken"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
            <ThemeToggle />
            <Button href="/dashboard" className="flex-1" size="sm">
              Launch app
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
