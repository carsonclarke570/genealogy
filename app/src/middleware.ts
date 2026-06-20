import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

/**
 * Gate every app route behind the shared-password session cookie. The login
 * page, the login/health endpoints, and Next's static assets are excluded via
 * the matcher below so they remain reachable while signed out.
 */
export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? "";

  let authorized = false;
  try {
    authorized = cookie.length > 0 && safeEqual(cookie, await sessionToken());
  } catch {
    authorized = false; // AUTH_SECRET missing/misconfigured — fail closed.
  }

  if (authorized) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match everything except the login UI/endpoint, the health check, and assets.
  matcher: [
    "/((?!login|api/login|api/health|_next/static|_next/image|favicon.ico).*)",
  ],
};
