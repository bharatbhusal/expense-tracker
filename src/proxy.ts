import { type NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { AUTH_COOKIE, PROTECTED_ROUTES } from "@/lib/constants";

const AUTH_PAGES = ["/auth/login", "/auth/signup"];

const adminProtectedPaths = ["/admin/projects/new", /\/admin\/projects\/[^/]+$/];

function isAdminProtected(pathname: string): boolean {
  return adminProtectedPaths.some((path) => {
    if (path instanceof RegExp) return path.test(pathname);
    return pathname === path;
  });
}

function isAppProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((route) => pathname.startsWith(route));
}

function isTokenProbablyValid(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload || typeof payload !== "object") return false;
    const exp = (payload as Record<string, unknown>).exp;
    if (!exp) return false;
    return Number(exp) * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // Admin routes — full signature verification
  if (isAdminProtected(pathname)) {
    if (!token) {
      return redirectToLogin(request, pathname, "/admin/login");
    }
    try {
      verifyToken(token);
      return NextResponse.next();
    } catch {
      return redirectToLogin(request, pathname, "/admin/login");
    }
  }

  // Root path — redirect based on auth status
  if (pathname === "/") {
    const hasValidToken = token ? isTokenProbablyValid(token) : false;
    if (hasValidToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Home page — public, no auth required
  if (pathname === "/home") {
    return NextResponse.next();
  }

  // App auth pages — redirect to dashboard if already logged in
  if (isAuthPage(pathname)) {
    const hasValidToken = token ? isTokenProbablyValid(token) : false;
    if (hasValidToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // App protected routes — lightweight token check
  if (isAppProtected(pathname)) {
    const hasValidToken = token ? isTokenProbablyValid(token) : false;
    if (!hasValidToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.search = "";
      url.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, pathname: string, loginPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/home",
    "/dashboard",
    "/admin/:path*",
    "/expenses/:path*",
    "/categories/:path*",
    "/logs",
    "/auth/:path*",
    "/more",
    "/buckets/:path*",
    "/budgets/:path*",
    "/budgets",
  ],
};
