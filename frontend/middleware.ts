import { NextResponse, type NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants";

const protectedRoutes = ["/dashboard", "/inbound", "/outbound", "/inventory", "/settings", "/saas", "/onboarding"];

const routePermissions: { prefix: string; permission?: string; role?: string }[] = [
  { prefix: "/saas", permission: "saas:access", role: "SUPER_ADMIN" },
  { prefix: "/settings/users", permission: "users:manage" },
  { prefix: "/settings/roles", permission: "roles:manage" }
];

function decodeToken(token: string): { role?: string; permissions?: string[] } {
  const segments = token.split(".");

  if (segments.length !== 3) {
    return {};
  }

  try {
    const payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");

    const binaryPayload = atob(payload);
    const bytes = Uint8Array.from(binaryPayload, (char) => char.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));

    const role = typeof decoded.role === "string" ? decoded.role : undefined;
    const permissions = Array.isArray(decoded.permissions)
      ? decoded.permissions.filter((permission) => typeof permission === "string")
      : undefined;

    return { role, permissions };
  } catch (error) {
    return {};
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const isProtected = protectedRoutes.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isProtected) {
    const { role, permissions } = decodeToken(token);
    const rule = routePermissions.find((rule) => request.nextUrl.pathname.startsWith(rule.prefix));
    if (rule) {
      const hasRole = rule.role ? role === rule.role : true;
      const hasPermission = rule.permission ? permissions?.includes(rule.permission) : true;
      if (!hasRole || !hasPermission) {
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
    }
  }

  if (request.nextUrl.pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.\\w+|_next).*)", "/", "/dashboard", "/login"]
};
