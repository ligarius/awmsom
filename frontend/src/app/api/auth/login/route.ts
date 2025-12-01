import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE, AUTH_REFRESH_COOKIE, API_BASE_URL } from "@/lib/constants";
import type { AuthCredentials, AuthResponse } from "@/types/auth";

export async function POST(request: Request) {
  const credentials = (await request.json()) as AuthCredentials;

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });

  const data = (await response.json()) as AuthResponse;

  if (!response.ok) {
    const message = (data as { message?: string })?.message ?? "Credenciales inválidas";
    return NextResponse.json({ message }, { status: response.status });
  }
  if (data.mfaRequired) {
    return NextResponse.json(data);
  }

  const nextResponse = NextResponse.json(data);

  if (data.accessToken) {
    nextResponse.cookies.set(AUTH_TOKEN_COOKIE, data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  }

  if (data.refreshToken) {
    nextResponse.cookies.set(AUTH_REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  }

  return nextResponse;
}
