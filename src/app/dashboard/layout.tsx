import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "ArcInvoice Pro dashboard — invoices, metrics, and workspace shell.",
};

/** Dashboard pages query PostgreSQL on each request. */
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
