// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

function run(path: string, cookie?: string) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return proxy(request);
}

function redirectsToLogin(response: Response) {
  const location = response.headers.get("location");
  return location !== null && new URL(location).pathname === "/login";
}

describe("proxy", () => {
  it("redirects to /login without a session cookie", () => {
    const response = run("/requests");

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(redirectsToLogin(response)).toBe(true);
  });

  it("ignores unrelated cookies", () => {
    expect(redirectsToLogin(run("/dashboard", "foo=bar"))).toBe(true);
  });

  it("lets the request through with the session cookie", () => {
    const response = run("/requests", "irm_session=abc");

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets the request through with a remember-me cookie", () => {
    const response = run(
      "/dashboard",
      "remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=xyz",
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps /login public", () => {
    const response = run("/login");

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("proxy matcher", () => {
  const matches = (url: string) =>
    unstable_doesMiddlewareMatch({ config, url });

  it.each(["/", "/login", "/requests", "/requests/123"])(
    "runs the proxy for %s",
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it.each([
    "/robots.txt",
    "/brand/logo.svg",
    "/icon.svg",
    "/_next/static/a.js",
  ])("skips %s", (url) => {
    expect(matches(url)).toBe(false);
  });
});
