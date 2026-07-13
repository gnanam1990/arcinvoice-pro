import { Button } from "@/components/ui/button";

export function OpenSource() {
  return (
    <section
      id="open-source"
      className="border-b border-border bg-surface"
      aria-labelledby="oss-heading"
    >
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--page-gutter)] py-16 sm:py-20">
        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-background shadow-sm">
          <div className="grid lg:grid-cols-2">
            <div className="space-y-5 p-8 sm:p-10">
              <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                Open source
              </p>
              <h2
                id="oss-heading"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                Built in the open, licensed for builders
              </h2>
              <p className="text-sm leading-relaxed text-muted sm:text-base">
                ArcInvoice Pro ships under the MIT License with contribution and
                security guidelines. Fork the scaffold, keep the design system,
                and extend the product layer at your pace.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/dashboard" variant="primary">
                  Explore the app shell
                </Button>
                <Button href="https://github.com" variant="outline" target="_blank" rel="noopener noreferrer">
                  Star on GitHub
                </Button>
              </div>
            </div>

            <div className="border-t border-border bg-surface-sunken p-8 sm:p-10 lg:border-t-0 lg:border-l">
              <ul className="space-y-4">
                {[
                  {
                    title: "Transparent security",
                    body: "Report issues privately via SECURITY.md — no public zero-days.",
                  },
                  {
                    title: "Clear contribution path",
                    body: "Lint, typecheck, and build gates documented for every PR.",
                  },
                  {
                    title: "No proprietary chrome",
                    body: "Original UI system — no third-party logos or locked assets.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
