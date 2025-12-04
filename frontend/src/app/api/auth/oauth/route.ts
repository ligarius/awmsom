import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { API_BASE_URL, AUTH_REFRESH_COOKIE, AUTH_TOKEN_COOKIE, OAUTH_NONCE_COOKIE, OAUTH_STATE_COOKIE } from "@/lib/constants";
import type { AuthResponse } from "@/types/auth";

type OAuthStartRequest = { provider?: string; tenantId?: string; redirectUri?: string };

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };
}

export async function POST(request: Request) {
  const { provider = "oidc-demo", tenantId, redirectUri } = (await request.json()) as OAuthStartRequest;

  if (!tenantId) {
    return NextResponse.json({ message: "Tenant requerido para iniciar OAuth" }, { status: 400 });
  }

  const url = new URL(request.url);
  const callbackUrl =
    redirectUri ?? `${url.origin}/api/auth/oauth?provider=${encodeURIComponent(provider)}&tenantId=${encodeURIComponent(tenantId)}`;

  const state = randomUUID();
  const nonce = randomUUID();

  const authorizeBase = process.env.NEXT_PUBLIC_OAUTH_AUTHORIZE_URL ?? `${API_BASE_URL}/auth/oauth/authorize`;
  const authorizeUrl = new URL(authorizeBase);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("provider", provider);
  authorizeUrl.searchParams.set("tenantId", tenantId);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);

  const response = NextResponse.json({ redirectUrl: authorizeUrl.toString() });
  const cookieOptions = buildCookieOptions();
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, cookieOptions);

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "oidc-demo";
  const tenantId = url.searchParams.get("tenantId");
  const receivedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (!tenantId) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("tenant-requerido")}`, url));
  }

  if (error) {
    const message = errorDescription ?? error;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url));
  }

  const cookieStore = cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!receivedState || !expectedState || receivedState !== expectedState) {
    const reason = !receivedState ? "faltan-credenciales-oauth" : "estado-oauth-invalido";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url));
  }

  const providerUserId = url.searchParams.get("provider_user_id") ?? undefined;
  const idToken = url.searchParams.get("id_token") ?? undefined;
  const accessToken = url.searchParams.get("access_token") ?? undefined;
  const email = url.searchParams.get("email") ?? undefined;
  const displayName = url.searchParams.get("display_name") ?? undefined;
  const nonce = cookieStore.get(OAUTH_NONCE_COOKIE)?.value;

  if (!providerUserId && !idToken && !accessToken) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("faltan-credenciales-oauth")}`, url));
  }

  const backendResponse = await fetch(`${API_BASE_URL}/auth/login/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      tenantId,
      providerUserId,
      idToken,
      accessToken,
      email,
      displayName,
      state: receivedState,
      expectedState,
      nonce
    })
  });

  const data = (await backendResponse.json()) as AuthResponse & { message?: string };

  if (!backendResponse.ok) {
    const message = data?.message ?? "No se pudo completar el inicio de sesión OAuth";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url));
  }

  const nextResponse = NextResponse.redirect(new URL("/dashboard", url));
  const cookieOptions = buildCookieOptions();

  if ("accessToken" in data && data.accessToken) {
    nextResponse.cookies.set(AUTH_TOKEN_COOKIE, data.accessToken, cookieOptions);
  }

  if ("refreshToken" in data && data.refreshToken) {
    nextResponse.cookies.set(AUTH_REFRESH_COOKIE, data.refreshToken, cookieOptions);
  }

  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_NONCE_COOKIE);

  return nextResponse;
}
