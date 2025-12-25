import { NextResponse, type NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants";
import type { AuthUser } from "@/types/auth";
import { canAccessSaas, resolveLandingRoute } from "@/lib/navigation";

const protectedRoutes = ["/dashboard", "/inbound", "/outbound", "/inventory", "/settings", "/saas", "/onboarding"];

const routePermissions: {
  prefix: string;
  permission?: string;
  role?: string;
  allow?: (user: AuthUser) => boolean;
}[] = [
  { prefix: "/saas", allow: canAccessSaas },
  { prefix: "/settings/users", permission: "USERS:MANAGE", role: "ADMIN" },
  { prefix: "/settings/roles", permission: "ROLES:MANAGE", role: "ADMIN" },
  { prefix: "/settings/compliance", permission: "COMPLIANCE:MANAGE", role: "ADMIN" }
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

function normalizePermission(permission: string) {
  return permission.trim().replace(/_/g, ":").toUpperCase();
}

function hasPermission(user: AuthUser, permission?: string) {
  if (!permission) return false;
  const normalizedTarget = normalizePermission(permission);
  const permissions = user.permissions ?? [];
  return permissions.some((perm) => normalizePermission(perm) === normalizedTarget);
}

function hasRole(user: AuthUser, role?: string) {
  if (!role) return false;
  const roles = user.roles ?? (user.role ? [user.role] : []);
  return roles.includes(role);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const isProtected = protectedRoutes.some((path) => request.nextUrl.pathname.startsWith(path));
  const isRoot = request.nextUrl.pathname === "/";

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isLogin = request.nextUrl.pathname === "/login";

  if (token && (isProtected || isLogin || isRoot)) {
    const user = await validateSession(request, token);

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const rule = routePermissions.find((rule) => request.nextUrl.pathname.startsWith(rule.prefix));
    if (rule) {
      const isAllowed = rule.allow
        ? rule.allow(user)
        : (() => {
            const roleAllowed = hasRole(user, rule.role);
            const permissionAllowed = hasPermission(user, rule.permission);
            return rule.role && rule.permission
              ? roleAllowed || permissionAllowed
              : rule.role
              ? roleAllowed
              : rule.permission
              ? permissionAllowed
              : true;
          })();
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    }

    if (isLogin) {
      return NextResponse.redirect(new URL(resolveLandingRoute(user), request.url));
    }

    if (isRoot) {
      return NextResponse.redirect(new URL(resolveLandingRoute(user), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.\\w+|_next).*)", "/", "/dashboard", "/login"]
};
