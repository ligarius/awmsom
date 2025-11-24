export const cookieJar = { token: "" };

export function cookies() {
  return {
    get: (name: string) => (name === "awms_token" && cookieJar.token ? { value: cookieJar.token } : undefined),
  };
}
