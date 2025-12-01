import { AUTH_TOKEN_COOKIE } from "@/lib/constants";
import { middleware } from "../../frontend/middleware";
import type { NextRequest } from "next/server";

declare const global: { atob?: (data: string) => string } & typeof globalThis;

const encodeToken = (payload: Record<string, unknown>) => {
  const base64Payload = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `header.${base64Payload}.signature`;
};

const createRequest = (pathname: string, token?: string): NextRequest => {
  return {
    cookies: {
      get: (name: string) => (name === AUTH_TOKEN_COOKIE && token ? { value: token } : undefined)
    },
    headers: {
      get: (name: string) => (name.toLowerCase() === "cookie" && token ? `${AUTH_TOKEN_COOKIE}=${token}` : undefined)
    },
    nextUrl: { pathname, origin: "http://localhost" },
    url: `http://localhost${pathname}`
  } as NextRequest;
};

const decodePayload = (token?: string) => {
  if (!token) return {};

  const [, base64Payload] = token.split(".");
  if (!base64Payload) return {};

  const normalized = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (error) {
    return {};
  }
};

describe("middleware authorization rules", () => {
  beforeAll(() => {
    global.atob = (data: string) => Buffer.from(data, "base64").toString("binary");
  });

  beforeEach(() => {
    global.fetch = jest.fn(async (_url, options: any) => {
      const cookieHeader = options?.headers?.cookie ?? "";
      const token = typeof cookieHeader === "string" ? cookieHeader.split("=")[1] : undefined;
      const payload = decodePayload(token);

      return { ok: true, json: async () => ({ user: payload }) } as any;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("/saas", () => {
    const saasPath = "/saas";

    it("denies access when only the role is present", async () => {
      const token = encodeToken({ role: "SUPER_ADMIN" });
      const response = await middleware(createRequest(saasPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("denies access when only the permission is present", async () => {
      const token = encodeToken({ permissions: ["saas:access"] });
      const response = await middleware(createRequest(saasPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when role and permission are present", async () => {
      const token = encodeToken({ role: "SUPER_ADMIN", permissions: ["saas:access"] });
      const response = await middleware(createRequest(saasPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });

  describe("/settings/users", () => {
    const usersPath = "/settings/users";

    it("denies access when the required permission is missing", async () => {
      const token = encodeToken({ role: "ADMIN" });
      const response = await middleware(createRequest(usersPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when the permission is present", async () => {
      const token = encodeToken({ permissions: ["users:manage"] });
      const response = await middleware(createRequest(usersPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });

  describe("/settings/roles", () => {
    const rolesPath = "/settings/roles";

    it("denies access without the required permission", async () => {
      const token = encodeToken({ role: "ADMIN" });
      const response = await middleware(createRequest(rolesPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when the permission is present", async () => {
      const token = encodeToken({ permissions: ["roles:manage"] });
      const response = await middleware(createRequest(rolesPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });

  describe("/settings/compliance", () => {
    const compliancePath = "/settings/compliance";

    it("denies access without the compliance scope", async () => {
      const token = encodeToken({ permissions: [] });
      const response = await middleware(createRequest(compliancePath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access with the compliance scope", async () => {
      const token = encodeToken({ permissions: ["compliance:manage"] });
      const response = await middleware(createRequest(compliancePath, token));

      expect(response).toEqual({ type: "next" });
    });
  });
});
