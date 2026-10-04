import { describe, expect, it } from "vitest";

import {
  canAccess,
  canAccessIn,
  appRoutes,
  homeFor,
  matchesRoute,
  routesFor,
  type AppRoute,
} from "./routes";

describe("homeFor", () => {
  it("sends the requester to the requests list", () => {
    expect(homeFor("requester")).toBe("/requests");
  });

  it.each(["analyst", "admin"] as const)(
    "sends %s to the dashboard",
    (role) => {
      expect(homeFor(role)).toBe("/dashboard");
    },
  );
});

describe("matchesRoute", () => {
  it("matches the exact path and sub-paths by segment", () => {
    expect(matchesRoute("/requests", "/requests")).toBe(true);
    expect(matchesRoute("/requests/123", "/requests")).toBe(true);
    expect(matchesRoute("/requests/123/edit", "/requests")).toBe(true);
  });

  it("does not match a different segment sharing the prefix", () => {
    expect(matchesRoute("/requestsx", "/requests")).toBe(false);
    expect(matchesRoute("/requests-old/1", "/requests")).toBe(false);
    expect(matchesRoute("/dashboard", "/requests")).toBe(false);
  });
});

describe("canAccess", () => {
  it("blocks the requester from the dashboard", () => {
    expect(canAccess("requester", "/dashboard")).toBe(false);
  });

  it.each(["analyst", "admin"] as const)(
    "allows %s on the dashboard",
    (role) => {
      expect(canAccess(role, "/dashboard")).toBe(true);
    },
  );

  it.each(["requester", "analyst", "admin"] as const)(
    "allows %s on requests, including sub-routes",
    (role) => {
      expect(canAccess(role, "/requests")).toBe(true);
      expect(canAccess(role, "/requests/123")).toBe(true);
    },
  );

  it("allows any role on paths outside the map", () => {
    expect(canAccess("requester", "/other")).toBe(true);
  });
});

describe("canAccessIn", () => {
  const icon = appRoutes[0].icon;
  const routes: AppRoute[] = [
    { href: "/requests", label: "A", icon, roles: ["requester", "analyst"] },
    { href: "/requests/new", label: "B", icon, roles: ["requester"] },
  ];

  it("uses the most specific route even when it comes after its parent", () => {
    expect(canAccessIn(routes, "analyst", "/requests/new")).toBe(false);
    expect(canAccessIn(routes, "analyst", "/requests/new/step")).toBe(false);
    expect(canAccessIn(routes, "requester", "/requests/new")).toBe(true);
    expect(canAccessIn(routes, "analyst", "/requests/123")).toBe(true);
  });

  it("does not depend on the order of the map", () => {
    const reversed = [...routes].reverse();
    expect(canAccessIn(reversed, "analyst", "/requests/new")).toBe(false);
  });
});

describe("routesFor", () => {
  it("lists only requests for the requester", () => {
    expect(routesFor("requester").map((r) => r.href)).toEqual(["/requests"]);
  });

  it.each(["analyst", "admin"] as const)(
    "lists dashboard and requests for %s",
    (role) => {
      expect(routesFor(role).map((r) => r.href)).toEqual([
        "/dashboard",
        "/requests",
      ]);
    },
  );
});
