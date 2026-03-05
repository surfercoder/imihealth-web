
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (cookieHeader.length > 4096) {
    const clearResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) {
        clearResponse.cookies.delete(name);
      }
    });
    return clearResponse;
  }

  const requestHeaders = new Headers(request.headers);

  const origin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (origin && forwardedHost) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== forwardedHost) {
        requestHeaders.set("x-forwarded-host", originHost);
      }
    } catch {
    }
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicPaths = ["/login", "/signup", "/forgot-password", "/auth"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
