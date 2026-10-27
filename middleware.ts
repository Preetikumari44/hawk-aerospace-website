import { NextRequest, NextResponse } from "next/server";

// TODO(backend): the backend's /api/skymap/auth/login and /api/skymap/auth/signup
// routes should set an httpOnly `skymap_session` cookie on success. This demo
// cookie carries a plain role prefix so middleware can mirror buyer vs owner
// routing locally. Mounted under /platforms/skymap as part of the Hawk
// Aerospace × SkyMap integration — see app/platforms/skymap.

const SKYMAP_BASE = "/platforms/skymap";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("skymap_session")?.value;
  const pathname = request.nextUrl.pathname;
  const ownerRoute = pathname.startsWith(`${SKYMAP_BASE}/owner`);
  const ownerAuthRoute =
    pathname === `${SKYMAP_BASE}/owner/login` ||
    pathname === `${SKYMAP_BASE}/owner/signup`;

  if (ownerAuthRoute) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL(
      ownerRoute ? `${SKYMAP_BASE}/owner/login` : `${SKYMAP_BASE}/login`,
      request.url,
    );
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.startsWith("owner-") ? "owner" : "buyer";
  if (ownerRoute && role !== "owner") {
    return NextResponse.redirect(new URL(`${SKYMAP_BASE}/owner/login`, request.url));
  }
  if (pathname.startsWith(`${SKYMAP_BASE}/dashboard`) && role !== "buyer") {
    return NextResponse.redirect(new URL(`${SKYMAP_BASE}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/platforms/skymap/dashboard/:path*", "/platforms/skymap/owner/:path*"],
};
