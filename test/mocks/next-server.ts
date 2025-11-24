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
  static redirect(url: URL) {
    return { type: "redirect", url: url.toString() };
  }

  static next() {
    return { type: "next" };
  }
}
