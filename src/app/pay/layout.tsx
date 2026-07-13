import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Public payment pages — never cache private invoice payloads.
 */
export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full font-sans antialiased">
      {children}
    </div>
  );
}
