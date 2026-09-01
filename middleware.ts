import { NextRequest, NextResponse } from "next/server";
import { detectLocale, isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export function middleware(request: NextRequest) {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(existing)) return NextResponse.next();

  const locale = detectLocale(request.headers.get("accept-language"));
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|go/|.*\\..*).*)"],
};
