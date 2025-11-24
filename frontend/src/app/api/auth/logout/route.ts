import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
