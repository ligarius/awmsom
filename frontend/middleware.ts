import { NextResponse, type NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants";
import type { AuthUser } from "@/types/auth";

const protectedRoutes = ["/dashboard", "/inbound", "/outbound", "/inventory", "/settings", "/saas", "/onboarding"];

const routePermissions: { prefix: string; permission?: string; role?: string }[] = [
  { prefix: "/saas", permission: "saas:access", role: "SUPER_ADMIN" },
  { prefix: "/settings/users", permission: "users:manage" },
  { prefix: "/settings/roles", permission: "roles:manage" }
];

const validationCache = new Map<string, { user: AuthUser | null; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

async function validateSession(request: NextRequest, token: string): Promise<AuthUser | null> {
  const cached = validationCache.get(token);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const validationUrl = new URL("/api/auth/me", request.nextUrl.origin);
  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const response = await fetch(validationUrl, {
      headers: { cookie: cookieHeader },
      cache: "no-store"
    });

    if (!response.ok) {
      validationCache.set(token, { user: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const { user } = (await response.json()) as { user: AuthUser | null };
    validationCache.set(token, { user, expiresAt: now + CACHE_TTL_MS });
    return user;
  } catch (error) {
    validationCache.set(token, { user: null, expiresAt: now + CACHE_TTL_MS });
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const isProtected = protectedRoutes.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isLogin = request.nextUrl.pathname === "/login";

  if (token && (isProtected || isLogin)) {
    const user = await validateSession(request, token);

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const rule = routePermissions.find((rule) => request.nextUrl.pathname.startsWith(rule.prefix));
    if (rule) {
      const hasRole = rule.role ? user.role === rule.role : true;
      const hasPermission = rule.permission ? user.permissions?.includes(rule.permission) : true;
      if (!hasRole || !hasPermission) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    }

    if (isLogin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.\\w+|_next).*)", "/", "/dashboard", "/login"]
};
