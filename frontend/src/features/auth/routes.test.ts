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

  it.each(["requester", "admin"] as const)(
    "allows %s to create a request",
    (role) => {
      expect(canAccess(role, "/requests/new")).toBe(true);
    },
  );

  it("blocks the analyst from creating a request but not from reading one", () => {
    expect(canAccess("analyst", "/requests/new")).toBe(false);
    expect(canAccess("analyst", "/requests")).toBe(true);
    expect(canAccess("analyst", "/requests/123")).toBe(true);
    expect(canAccess("analyst", "/requests/123/edit")).toBe(true);
  });

  it("allows only the admin on the users screen", () => {
    expect(canAccess("admin", "/users")).toBe(true);
    expect(canAccess("analyst", "/users")).toBe(false);
    expect(canAccess("requester", "/users")).toBe(false);
  });

  it("applies the users restriction to its sub-paths too", () => {
    expect(canAccess("admin", "/users/7")).toBe(true);
    expect(canAccess("analyst", "/users/7")).toBe(false);
    expect(canAccess("requester", "/users/7")).toBe(false);
  });

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
  it.each(["requester", "analyst", "admin"] as const)(
    "keeps /requests/new out of the menu for %s",
    (role) => {
      expect(routesFor(role).map((r) => r.href)).not.toContain("/requests/new");
    },
  );

  it("skips entries with nav false even when the role matches", () => {
    expect(appRoutes.find((r) => r.href === "/requests/new")?.nav).toBe(false);
  });

  it("lists only requests for the requester", () => {
    expect(routesFor("requester").map((r) => r.href)).toEqual(["/requests"]);
  });

  it("lists dashboard and requests for the analyst", () => {
    expect(routesFor("analyst").map((r) => r.href)).toEqual([
      "/dashboard",
      "/requests",
    ]);
  });

  it("lists dashboard, requests and users for the admin", () => {
    expect(routesFor("admin").map((r) => r.href)).toEqual([
      "/dashboard",
      "/requests",
      "/users",
    ]);
  });
});
