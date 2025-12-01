export type NextRequest = {
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
  nextUrl: {
    pathname: string;
  };
  url: string;
};

export class NextResponse {
  static json(body: unknown, init?: { status?: number }) {
    const store = new Map<string, { value: string; options?: Record<string, unknown> }>();
    const cookies = {
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        store.set(name, { value, options });
      },
      get: (name: string) => store.get(name),
    };

    return { type: "json", body, status: init?.status ?? 200, cookies };
  }

  static redirect(url: URL | string, status = 307) {
    const store = new Map<string, { value: string; options?: Record<string, unknown> }>();
    const cookies = {
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        store.set(name, { value, options });
      },
      get: (name: string) => store.get(name),
    };

    return { type: "redirect", url: url.toString(), status, cookies };
  }

  static next() {
    return { type: "next" };
  }
}
