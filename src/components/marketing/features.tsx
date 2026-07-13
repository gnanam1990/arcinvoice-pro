const features = [
  {
    title: "App shell",
    description:
      "Sidebar, top bar, and content frame with desktop, tablet, and mobile layouts.",
    icon: ShellIcon,
  },
  {
    title: "Theme system",
    description:
      "Light and dark themes with neutral surfaces and a restrained violet accent.",
    icon: ThemeIcon,
  },
  {
    title: "Financial primitives",
    description:
      "Metric cards, status chips, network and wallet badges — ready for real data.",
    icon: MetricIcon,
  },
  {
    title: "Accessible by default",
    description:
      "Visible keyboard focus, reduced-motion support, and semantic structure.",
    icon: A11yIcon,
  },
  {
    title: "Design tokens",
    description:
      "Typography, spacing, borders, shadows, and radius scale as CSS variables.",
    icon: TokenIcon,
  },
  {
    title: "Geist typography",
    description:
      "Geist Sans for UI, Geist Mono for addresses, amounts, and status codes.",
    icon: TypeIcon,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-b border-border"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--page-gutter)] py-16 sm:py-20">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            Features
          </p>
          <h2
            id="features-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Everything you need before product logic
          </h2>
          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Shared components and layout primitives so invoice features ship
            into a cohesive shell — not a blank canvas.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs transition-shadow hover:shadow-md motion-reduce:transition-none"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-accent-muted text-accent">
                <feature.icon />
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ShellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M3 9h6" strokeLinecap="round" />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

function MetricIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15v-3M12 15V9M16 15v-6" strokeLinecap="round" />
    </svg>
  );
}

function A11yIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <path d="M6 9h12M12 9v10M9 19h6M8 13h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M5 6h14M12 6v12M8 18h8" strokeLinecap="round" />
    </svg>
  );
}
