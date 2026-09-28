import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE = "timetable_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
