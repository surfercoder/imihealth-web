import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  integrations: [Sentry.browserTracingIntegration()],

  // Performance Monitoring — capture all traces during MVP, reduce in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

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
    // Already loaded, defer slightly to let main thread settle
    setTimeout(initReplay, 2000);
  } else {
    window.addEventListener("load", () => setTimeout(initReplay, 2000));
  }
}
