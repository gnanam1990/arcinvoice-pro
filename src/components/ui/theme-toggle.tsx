"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface text-foreground transition-colors hover:bg-surface-sunken",
        className,
      )}
      aria-label={
        mounted
          ? `Switch to ${theme === "dark" ? "light" : "dark"} theme`
          : "Toggle theme"
      }
    >
      <span className="sr-only">Toggle theme</span>
      {/* Sun */}
      <svg
        className={cn("h-4 w-4", mounted && theme === "dark" ? "hidden" : "block")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Moon */}
      <svg
        className={cn("h-4 w-4", mounted && theme === "dark" ? "block" : "hidden")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
      </svg>
    </button>
  );
}
