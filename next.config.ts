import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/cars/conversation": [
      "./data/production/personas/safe-traits/**/*",
      "./data/production/catalog/governance/**/*",
      "./data/production/rec-offer-audit-foundation/**/*",
    ],
    "/api/cars/paid-comparison/report/pdf": [
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff2",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff2",
    ],
  },
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "wylflrzf7gws55yp.public.blob.vercel-storage.com",
      port: "",
      pathname: "/cars/**",
      search: "",
    }],
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https://wylflrzf7gws55yp.public.blob.vercel-storage.com; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io; upgrade-insecure-requests` },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "expiya",
  project: "expiya-platform",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Shared client chunks can contain application frames too. Upload them so
  // production errors outside route-specific bundles can be symbolicated.
  widenClientFileUpload: true,
  silent: true,
  telemetry: false,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  webpack: { treeshake: { removeDebugLogging: true } },
});
