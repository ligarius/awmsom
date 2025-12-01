import { GET as oauthCallback, POST as oauthStart } from "../../frontend/src/app/api/auth/oauth/route";
import { AUTH_REFRESH_COOKIE, AUTH_TOKEN_COOKIE, API_BASE_URL } from "@/lib/constants";
import type { AuthResponse, AuthUser } from "@/types/auth";

describe("oauth API route", () => {
  const user: AuthUser = {
    id: "user-1",
    email: "oauth@example.com",
    fullName: "OAuth User",
    tenantId: "tenant-1",
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
  });

  it("stores tokens and redirects to dashboard on callback success", async () => {
    const authResponse: AuthResponse = { accessToken: "token-123", refreshToken: "refresh-789", user };
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => authResponse });

    const request = {
      url: "https://frontend.awms.com/api/auth/oauth?provider=oidc-demo&tenantId=tenant-1&provider_user_id=abc-1&id_token=id-token",
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
