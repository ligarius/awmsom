import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL, AUTH_TOKEN_COOKIE } from "@/lib/constants";
import type { AuthUser } from "@/types/auth";

export async function GET() {
  const token = cookies().get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return NextResponse.json({ user: null }, { status: response.status });
  }

  const user = (await response.json()) as AuthUser;
  return NextResponse.json({ user });
}
