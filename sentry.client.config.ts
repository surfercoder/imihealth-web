import * as Sentry from "@sentry/nextjs";

const integrations = [
  Sentry.browserTracingIntegration(),
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : []),
];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  integrations,

  // Performance Monitoring — capture all traces during MVP, reduce in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay — 10% of normal sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out common browser noise
  ignoreErrors: [
    // Browser extensions & third-party scripts
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    // Generic browser errors
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    "Network request failed",
    // User aborted requests
    "AbortError",
    "The operation was aborted",
  ],

  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Safari extensions
    /^safari-web-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
  ],

  // Strip PII from events before sending
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
    }
    return event;
  },
});
