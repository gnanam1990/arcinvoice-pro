import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cache and security headers for public invoice/receipt routes.
 * Avoid shared-cache leakage of tokenized private business data.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/pay/") || pathname.startsWith("/receipt/")) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Frame-Options", "DENY");
    // CSP-compatible baseline. unsafe-eval only in development (React refresh).
    const scriptSrc =
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }

  return response;
}

export const config = {
  matcher: ["/pay/:path*", "/receipt/:path*"],
};
