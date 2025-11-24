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
    nextUrl: { pathname },
    url: `http://localhost${pathname}`
  } as NextRequest;
};

describe("middleware authorization rules", () => {
  beforeAll(() => {
    global.atob = (data: string) => Buffer.from(data, "base64").toString("binary");
  });

  describe("/saas", () => {
    const saasPath = "/saas";

    it("denies access when only the role is present", () => {
      const token = encodeToken({ role: "SUPER_ADMIN" });
      const response = middleware(createRequest(saasPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("denies access when only the permission is present", () => {
      const token = encodeToken({ permissions: ["saas:access"] });
      const response = middleware(createRequest(saasPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when role and permission are present", () => {
      const token = encodeToken({ role: "SUPER_ADMIN", permissions: ["saas:access"] });
      const response = middleware(createRequest(saasPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });

  describe("/settings/users", () => {
    const usersPath = "/settings/users";

    it("denies access when the required permission is missing", () => {
      const token = encodeToken({ role: "ADMIN" });
      const response = middleware(createRequest(usersPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when the permission is present", () => {
      const token = encodeToken({ permissions: ["users:manage"] });
      const response = middleware(createRequest(usersPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });

  describe("/settings/roles", () => {
    const rolesPath = "/settings/roles";

    it("denies access without the required permission", () => {
      const token = encodeToken({ role: "ADMIN" });
      const response = middleware(createRequest(rolesPath, token));

      expect(response).toEqual(expect.objectContaining({ type: "redirect" }));
      expect((response as { url: string }).url).toContain("/forbidden");
    });

    it("allows access when the permission is present", () => {
      const token = encodeToken({ permissions: ["roles:manage"] });
      const response = middleware(createRequest(rolesPath, token));

      expect(response).toEqual({ type: "next" });
    });
  });
});
