import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "irm_session";
const REMEMBER_COOKIE_PREFIX = "remember_web_";

// Pages reachable without a session (exact match on the pathname).
export const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
];

// Optimistic check only: it never calls the API. Who the user is comes from
// GET /api/me, and the real authorization lives in the API (ADR 0004).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const hasSession = request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name === SESSION_COOKIE || name.startsWith(REMEMBER_COOKIE_PREFIX),
    );

  if (hasSession) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
