import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Overview" },
      { href: "/#workflow", label: "Workflow" },
      { href: "/#features", label: "Features" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/#open-source", label: "Open source" },
      { href: "https://github.com", label: "GitHub", external: true },
      { href: "/#features", label: "Design system" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#product", label: "About" },
      { href: "/#open-source", label: "Contribute" },
      { href: "/dashboard", label: "App" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-[var(--content-max)] gap-10 px-[var(--page-gutter)] py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Premium invoicing foundation for teams building on modern financial
            rails — clean, accessible, and production-minded.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                    {...("external" in link && link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-2 px-[var(--page-gutter)] py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ArcInvoice Pro. MIT licensed.</p>
          <p className="font-mono">Built with Next.js · Tailwind · pnpm</p>
        </div>
      </div>
    </footer>
  );
}
