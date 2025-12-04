import { GET as oauthCallback, POST as oauthStart } from "../../frontend/src/app/api/auth/oauth/route";
import {
  AUTH_REFRESH_COOKIE,
  AUTH_TOKEN_COOKIE,
  API_BASE_URL,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE
} from "@/lib/constants";
import type { AuthResponse, AuthUser } from "@/types/auth";

const cookieJar = new Map<string, string>();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    }
  }))
}));

describe("oauth API route", () => {
  const user: AuthUser = {
    id: "user-1",
    email: "oauth@example.com",
    fullName: "OAuth User",
    tenantId: "tenant-1",
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    cookieJar.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns an authorization URL for the OAuth start flow", async () => {
    const request = {
      json: async () => ({ provider: "oidc-demo", tenantId: "tenant-1" }),
      url: "https://frontend.awms.com/api/auth/oauth",
    } as Request;

    const response = (await oauthStart(request)) as any;

    expect(response.body.redirectUrl).toContain("tenant-1");
    expect(response.body.redirectUrl).toContain("oidc-demo");
    expect(response.body.redirectUrl).toContain(
      "redirect_uri=https%3A%2F%2Ffrontend.awms.com%2Fapi%2Fauth%2Foauth%3Fprovider%3Doidc-demo%26tenantId%3Dtenant-1"
    );
    expect(response.body.redirectUrl).toContain("state=");
    expect(response.body.redirectUrl).toContain("nonce=");

    const stateCookie = response.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const nonceCookie = response.cookies.get(OAUTH_NONCE_COOKIE)?.value;
    expect(stateCookie).toBeDefined();
    expect(nonceCookie).toBeDefined();
  });

  it("stores tokens and redirects to dashboard on callback success", async () => {
    const authResponse: AuthResponse = { accessToken: "token-123", refreshToken: "refresh-789", user };
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => authResponse });

    cookieJar.set(OAUTH_STATE_COOKIE, "state-123");
    cookieJar.set(OAUTH_NONCE_COOKIE, "nonce-123");

    const request = {
      url: "https://frontend.awms.com/api/auth/oauth?provider=oidc-demo&tenantId=tenant-1&provider_user_id=abc-1&id_token=id-token&state=state-123",
    } as Request;

    const response = (await oauthCallback(request)) as any;

    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/login/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "oidc-demo",
        tenantId: "tenant-1",
        providerUserId: "abc-1",
        idToken: "id-token",
        accessToken: undefined,
        email: undefined,
        displayName: undefined,
        state: "state-123",
        expectedState: "state-123",
        nonce: "nonce-123"
      }),
    });

    expect(response.type).toBe("redirect");
    expect(response.url).toBe("https://frontend.awms.com/dashboard");
    expect(response.cookies.get(AUTH_TOKEN_COOKIE)?.value).toBe("token-123");
    expect(response.cookies.get(AUTH_REFRESH_COOKIE)?.value).toBe("refresh-789");
  });

  it("redirects back to login with provider errors", async () => {
    const request = {
      url: "https://frontend.awms.com/api/auth/oauth?tenantId=tenant-1&error=access_denied&error_description=denied",
    } as Request;

    const response = (await oauthCallback(request)) as any;

    expect(response.type).toBe("redirect");
    expect(response.url).toBe("https://frontend.awms.com/login?error=denied");
  });
});
