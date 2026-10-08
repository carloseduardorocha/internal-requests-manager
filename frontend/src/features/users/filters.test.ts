import { describe, expect, it } from "vitest";

import {
  hasActiveUserFilters,
  parseUserFilters,
  toUserSearchParams,
} from "./filters";
import type { UserFilters } from "./types";

const AREAS = [1, 2, 3];

const defaults: UserFilters = {
  search: "",
  role: "",
  area_id: null,
  status: "",
  page: 1,
};

function parse(query: string, areaIds = AREAS) {
  return parseUserFilters(new URLSearchParams(query), areaIds);
}

describe("parseUserFilters", () => {
  it("returns the defaults for an empty query", () => {
    expect(parse("")).toEqual(defaults);
  });

  it("reads every filter with the API names", () => {
    expect(
      parse("search=carla&role=analyst&area_id=2&status=deactivated&page=3"),
    ).toEqual({
      search: "carla",
      role: "analyst",
      area_id: 2,
      status: "deactivated",
      page: 3,
    });
  });

  it.each(["requester", "analyst", "admin"])("accepts the role %s", (role) => {
    expect(parse(`role=${role}`).role).toBe(role);
  });

  it.each(["active", "deactivated"])("accepts the status %s", (status) => {
    expect(parse(`status=${status}`).status).toBe(status);
  });

  it("trims the search and cuts it at 255 characters", () => {
    expect(parse("search=%20%20ana%20%20").search).toBe("ana");
    expect(parse(`search=${"a".repeat(300)}`).search).toHaveLength(255);
  });

  it.each(["superuser", "ADMIN", "", "1"])(
    "falls back to no role for the invalid value %j",
    (role) => {
      expect(parse(`role=${role}`).role).toBe("");
    },
  );

  it.each(["inactive", "ACTIVE", "", "0"])(
    "falls back to no status for the invalid value %j",
    (status) => {
      expect(parse(`status=${status}`).status).toBe("");
    },
  );

  it("discards an area_id that is not a known area", () => {
    expect(parse("area_id=99").area_id).toBeNull();
  });

  it("discards every area_id while the known areas are empty", () => {
    expect(parse("area_id=2", []).area_id).toBeNull();
  });

  it.each(["abc", "-1", "1.5", "2x", "", " 2"])(
    "discards a malformed area_id (%j)",
    (value) => {
      expect(parse(`area_id=${encodeURIComponent(value)}`).area_id).toBeNull();
    },
  );

  it("keeps a valid page", () => {
    expect(parse("page=7").page).toBe(7);
  });

  it.each(["0", "-2", "abc", "1.5", "", "1e3", "99999999999999999999"])(
    "falls back to page 1 for the invalid page %j",
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1);
    },
  );

  it("ignores unknown parameters", () => {
    expect(parse("sort=name&foo=bar")).toEqual(defaults);
  });
});

describe("toUserSearchParams", () => {
  it("leaves defaults out of the URL", () => {
    expect(toUserSearchParams(defaults).toString()).toBe("");
  });

  it("writes every active filter with the API names, in a fixed order", () => {
    expect(
      toUserSearchParams({
        search: "carla",
        role: "analyst",
        area_id: 2,
        status: "deactivated",
        page: 3,
      }).toString(),
    ).toBe("search=carla&role=analyst&area_id=2&status=deactivated&page=3");
  });

  it("leaves page 1 out", () => {
    expect(toUserSearchParams({ ...defaults, role: "admin" }).toString()).toBe(
      "role=admin",
    );
  });

  it("encodes the search", () => {
    expect(
      toUserSearchParams({ ...defaults, search: "a b&c" }).toString(),
    ).toBe("search=a+b%26c");
  });

  it("round-trips what it writes", () => {
    const filters: UserFilters = {
      search: "ana maria",
      role: "requester",
      area_id: 3,
      status: "active",
      page: 2,
    };

    expect(parseUserFilters(toUserSearchParams(filters), AREAS)).toEqual(
      filters,
    );
  });
});

describe("hasActiveUserFilters", () => {
  it("is false for the defaults, whatever the page", () => {
    expect(hasActiveUserFilters(defaults)).toBe(false);
    expect(hasActiveUserFilters({ ...defaults, page: 4 })).toBe(false);
  });

  it.each([
    { search: "a" },
    { role: "admin" as const },
    { area_id: 1 },
    { status: "active" as const },
  ])("is true with %j", (patch) => {
    expect(hasActiveUserFilters({ ...defaults, ...patch })).toBe(true);
  });
});
