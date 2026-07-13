import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Playwright (127.0.0.1) to hit the dev server HMR endpoints.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
