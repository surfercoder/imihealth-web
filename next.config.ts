import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  experimental: {
    messages: {
      format: "json",
      locales: ["es", "en"],
      path: "./messages",
      precompile: true,
    },
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingIncludes: {
    "/api/send-whatsapp": ["./public/assets/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "radix-ui",
      "@sentry/nextjs",
      "cmdk",
      "react-hook-form",
      "@hookform/resolvers",
      "zod",
    ],
  },
  async headers() {
    return [
      {
        // Security & performance headers for all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        // Cache public image/font assets
        source: "/assets/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "imi-health",
  project: "imihealth-web",
  // Suppress source map upload logs outside CI
  silent: !process.env.CI,
  // Route Sentry requests through your Next.js server to avoid ad-blockers
  tunnelRoute: "/monitoring",
  // Hide source maps from users while still uploading them to Sentry
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Reduce Sentry's client-side bundle size
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
