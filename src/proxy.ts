import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const isDev = process.env.NODE_ENV === "development";

function buildCsp() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const policy = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://www.google.com",
      "https://www.gstatic.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      supabaseUrl,
      `${supabaseUrl.replace("https://", "wss://")}`,
      "https://www.google.com",
      "https://api.assemblyai.com",
      "https://api.anthropic.com",
    ],
    "frame-src": ["https://www.google.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(policy)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(" ")}` : key
    )
    .join("; ");
}

const cspHeaderValue = buildCsp();

export async function proxy(request: NextRequest) {
  // Run Supabase session refresh + auth redirect logic
  const response = await updateSession(request);

  // Apply CSP header to every response
  response.headers.set("Content-Security-Policy", cspHeaderValue);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - monitoring (Sentry tunnel)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|monitoring|assets).*)",
  ],
};
