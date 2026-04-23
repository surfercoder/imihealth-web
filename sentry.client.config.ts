import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.browserTracingIntegration({
      // Real navigations are captured by captureRouterTransitionStart in
      // instrumentation-client.ts. Disable the integration's own navigation
      // detection so that replaceState calls (e.g. tab switches) don't
      // create spurious navigation transactions.
      instrumentNavigation: false,
      // Don't create trace spans for Sentry's own /monitoring tunnel
      // requests — prevents a feedback loop.
      shouldCreateSpanForRequest: (url) => !url.includes("/monitoring"),
    }),
  ],

  // Only attach trace headers to our own API, not to third-party services
  tracePropagationTargets: ["localhost", /^\//, /\.imihealth\./],

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Session Replay — configured below via lazy-loading to avoid blocking initial render
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
    // Supabase auth lock contention — benign race between concurrent token refreshes
    "Lock.*was released because another request stole it",
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

// Lazy-load Session Replay after the page is fully interactive so it doesn't
// compete with LCP or block the main thread during initial render.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const initReplay = async () => {
    try {
      const { replayIntegration } = await import("@sentry/nextjs");
      Sentry.addIntegration(
        replayIntegration({ maskAllText: true, blockAllMedia: true })
      );
    } catch {
      // Silently ignore — replay is non-critical
    }
  };

  if (document.readyState === "complete") {
    // Delay well past TTI (~4-5s) so Replay JS execution doesn't contribute
    // to Total Blocking Time. The chunk executes in ~245ms and must fire
    // after the CPU is already idle (i.e., after Time to Interactive).
    setTimeout(initReplay, 8000);
  } else {
    window.addEventListener("load", () => setTimeout(initReplay, 8000));
  }
}
