import * as Sentry from "@sentry/nextjs";
import "../sentry.client.config";

// Instrument Next.js client-side navigations for performance tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
