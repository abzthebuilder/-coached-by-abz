import { NextResponse, type NextRequest } from "next/server";

/**
 * The site's main address, taken from APP_URL (e.g. https://coachedbyabz.com).
 * Visits to the Railway address or to www. are sent there, so everyone uses one address.
 */
function canonicalHost(): string | null {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).host.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isAlias(host: string, canonical: string) {
  return host === `www.${canonical}` || host.endsWith(".up.railway.app");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. One address for the whole site. Only for normal page visits (GET/HEAD), never for
  //    Railway's health check, and only once APP_URL points at a custom domain.
  const canonical = canonicalHost();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (
    canonical &&
    host &&
    host !== canonical &&
    isAlias(host, canonical) &&
    !canonical.endsWith(".up.railway.app") &&
    (req.method === "GET" || req.method === "HEAD") &&
    pathname !== "/api/health"
  ) {
    return NextResponse.redirect(`https://${canonical}${pathname}${req.nextUrl.search}`, 308);
  }

  // 2. Cheap first gate: no session cookie, no portal. Real checks happen server-side on every request.
  const inPortal = /^\/(app|coach)(\/|$)/.test(pathname); // not /coaching or /apple-icon
  if (inPortal && !req.cookies.get("abz_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static files.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
