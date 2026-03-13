import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
});
