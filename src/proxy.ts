import { NextRequest, NextResponse } from "next/server";
import { createContentSecurityPolicy } from "./lib/security-headers";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = createContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === "development",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const isCvDomain = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
  ].some(
    (host) =>
      host
        ?.split(",")[0]
        .trim()
        .toLowerCase()
        .replace(/:\d+$/, "") === "cv.apdf.app",
  );
  const pathname = request.nextUrl.pathname;
  const destinationPath =
    pathname === "/" || pathname === "/cv" || pathname === "/cv/"
      ? "/cv/page.html"
      : pathname.startsWith("/cv/")
        ? pathname
        : `/cv${pathname}`;
  const response = isCvDomain
    ? NextResponse.rewrite(
        new URL(destinationPath, request.url),
        { request: { headers: requestHeaders } },
      )
    : NextResponse.next({
        request: { headers: requestHeaders },
      });

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|vendor/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/:path*",
      has: [{ type: "host", value: "cv.apdf.app" }],
    },
  ],
};
