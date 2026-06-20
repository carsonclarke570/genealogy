import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

/**
 * Verify the submitted password against SITE_PASSWORD and, on success, set the
 * signed session cookie. Redirects (303) back into the app or to the login page
 * with an error flag.
 *
 * The Location header is kept *relative* on purpose: behind Railway's proxy the
 * route handler sees the internal origin (localhost:8080), so an absolute
 * redirect built from req.url would send the browser to the wrong host. A
 * relative Location is resolved by the browser against the public origin.
 */
function redirect(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const expected = process.env.SITE_PASSWORD ?? "";

  if (expected.length === 0 || !safeEqual(password, expected)) {
    return redirect("/login?error=1");
  }

  const res = redirect("/");
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
