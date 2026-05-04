import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Performance Monitoring — capture every trace in non-prod, sample 20% in prod.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
