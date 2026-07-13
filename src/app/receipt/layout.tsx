import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ReceiptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full font-sans antialiased">{children}</div>;
}
