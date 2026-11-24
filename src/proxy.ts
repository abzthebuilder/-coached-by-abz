import { NextResponse, type NextRequest } from "next/server";

// Cheap first gate: no session cookie, no portal. Real checks happen server-side on every request.
export function proxy(req: NextRequest) {
  if (!req.cookies.get("abz_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/coach/:path*"] };
