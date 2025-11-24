import { NextResponse, type NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants";

const protectedRoutes = ["/dashboard", "/inbound", "/outbound", "/inventory", "/settings", "/saas", "/onboarding"];

const routePermissions: { prefix: string; permission?: string; role?: string }[] = [
  { prefix: "/saas", permission: "saas:access", role: "SUPER_ADMIN" },
  { prefix: "/settings/users", permission: "users:manage" },
  { prefix: "/settings/roles", permission: "roles:manage" }
];

function decodeToken(token: string): { role?: string; permissions?: string[] } {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return { role: decoded.role, permissions: decoded.permissions };
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
      if (!hasRole && !hasPermission) {
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
