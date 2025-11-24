import { POST as loginRoute } from "../../frontend/src/app/api/auth/login/route";
import { GET as meRoute } from "../../frontend/src/app/api/auth/me/route";
import { AUTH_REFRESH_COOKIE, AUTH_TOKEN_COOKIE, API_BASE_URL } from "@/lib/constants";
import type { AuthResponse, AuthUser } from "@/types/auth";
import { cookieJar } from "next/headers";

describe("auth API routes", () => {
  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    fullName: "Test User",
    tenantId: "tenant-1",
    role: "ADMIN",
    permissions: ["users:manage"],
  };

  beforeEach(() => {
    cookieJar.token = "";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("sets auth cookies on login and returns the user payload", async () => {
    const authResponse: AuthResponse = {
      accessToken: "access-123",
      refreshToken: "refresh-456",
      user,
    };

    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => authResponse });

    const request = {
      json: async () => ({ email: "user@example.com", password: "secret", tenantId: "tenant-1" }),
    } as Request;

    const response = (await loginRoute(request)) as any;

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "secret", tenantId: "tenant-1" }),
    });

    expect(response.cookies.get(AUTH_TOKEN_COOKIE)?.value).toBe("access-123");
    expect(response.cookies.get(AUTH_REFRESH_COOKIE)?.value).toBe("refresh-456");
    expect(response.body).toEqual(authResponse);
  });

  it("recovers the session using the stored token", async () => {
    cookieJar.token = "session-token";
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => user });

    const response = (await meRoute()) as any;

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: "Bearer session-token" },
    });

    expect(response.body).toEqual({ user });
  });
});
