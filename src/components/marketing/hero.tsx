import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export function Hero() {
  return (
    <section
      id="product"
      className="relative overflow-hidden border-b border-border"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 accent-glow" aria-hidden />
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-60" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-10 px-[var(--page-gutter)] py-16 sm:py-20 lg:flex-row lg:items-center lg:gap-16 lg:py-28">
        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="online" label="UI foundation" pulse />
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted">
              Original Arc-inspired design
            </span>
          </div>

          <h1
            id="hero-heading"
            className="max-w-xl text-[length:var(--text-5xl)] font-semibold tracking-tight text-foreground"
            style={{ lineHeight: "var(--leading-tight)" }}
          >
            Invoice with clarity on modern financial rails
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            ArcInvoice Pro is a premium invoicing foundation — neutral surfaces,
            restrained violet accent, and an accessible app shell ready for
            wallet and settlement features when you add them.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/dashboard" size="lg">
              Open dashboard
            </Button>
            <Button href="/#workflow" variant="outline" size="lg">
              See the workflow
            </Button>
          </div>

          <dl className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 sm:gap-6">
            {[
              { label: "Themes", value: "Light & dark" },
              { label: "Layouts", value: "Desktop → mobile" },
              { label: "License", value: "MIT" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                  {item.label}
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex-1 lg:max-w-md">
          <div className="surface-raised overflow-hidden p-1">
            <div className="rounded-[calc(var(--radius-xl)-2px)] border border-border bg-surface-sunken p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">
                  Invoice preview
                </span>
                <span className="font-mono text-[10px] text-muted">UI only</span>
              </div>
              <div className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Bill to</p>
                    <p className="text-sm font-semibold text-foreground">
                      Northline Studio
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">
                    Draft
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Design retainer</span>
                  <span className="font-mono tabular-nums text-foreground">
                    $4,800.00
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Platform fee</span>
                  <span className="font-mono tabular-nums text-foreground">
                    $48.00
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-end justify-between">
                  <span className="text-xs font-medium text-muted uppercase">
                    Total due
                  </span>
                  <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
                    $4,848.00
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted">
                Sample layout — not live invoice data
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
