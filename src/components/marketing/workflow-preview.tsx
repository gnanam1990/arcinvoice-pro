const steps = [
  {
    step: "01",
    title: "Compose",
    description:
      "Capture line items, tax, and due dates in a calm, document-first editor.",
  },
  {
    step: "02",
    title: "Share",
    description:
      "Send a branded link or export a clean PDF — clients never leave the flow.",
  },
  {
    step: "03",
    title: "Settle",
    description:
      "Track status from draft to paid. Settlement rails plug in later — UI first.",
  },
  {
    step: "04",
    title: "Reconcile",
    description:
      "Metric cards and ledgers surface cash-in without noise or clutter.",
  },
];

export function WorkflowPreview() {
  return (
    <section
      id="workflow"
      className="border-b border-border bg-surface"
      aria-labelledby="workflow-heading"
    >
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--page-gutter)] py-16 sm:py-20">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            Invoice workflow
          </p>
          <h2
            id="workflow-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            From draft to paid — without the clutter
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            A four-stage pipeline preview. Each stage is presentational today so
            product logic can land without reworking the shell.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((item, index) => (
            <li
              key={item.step}
              className="relative flex flex-col rounded-[var(--radius-xl)] border border-border bg-background p-5 shadow-xs"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-accent">
                  {item.step}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className="hidden text-muted xl:inline"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-background shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="ml-2 font-mono text-[11px] text-muted">
              pipeline · preview
            </span>
          </div>
          <div className="grid gap-0 md:grid-cols-3">
            {[
              { stage: "Draft", count: "—", note: "Empty workspace" },
              { stage: "Sent", count: "—", note: "Awaiting data layer" },
              { stage: "Paid", count: "—", note: "Demo metrics only" },
            ].map((col) => (
              <div
                key={col.stage}
                className="border-border p-5 md:border-r md:last:border-r-0"
              >
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  {col.stage}
                </p>
                <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {col.count}
                </p>
                <p className="mt-1 text-xs text-muted">{col.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
