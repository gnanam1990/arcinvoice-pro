import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { wagmiConfig } from "@/lib/wallet/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ArcInvoice Pro",
    template: "%s · ArcInvoice Pro",
  },
  description:
    "Premium invoicing foundation with an Arc-inspired financial UI — light and dark themes, app shell, and accessible design tokens.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  // Hydrate prior connection from cookies only — never touches window.ethereum on the server.
  const initialState = cookieToInitialState(wagmiConfig, cookie);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeScript />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <WalletProvider initialState={initialState}>
          <ThemeProvider>{children}</ThemeProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
