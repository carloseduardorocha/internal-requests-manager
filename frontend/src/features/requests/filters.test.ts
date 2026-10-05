import { describe, expect, it } from "vitest";

import { hasActiveFilters, parseFilters, toSearchParams } from "./filters";
import type { InternalRequestFilters } from "./types";

const defaults: InternalRequestFilters = {
  search: "",
  status: "",
  priority: "",
  sort: "-created_at",
  page: 1,
};

function parse(query: string) {
  return parseFilters(new URLSearchParams(query));
}

describe("parseFilters", () => {
  it("returns the defaults for an empty query", () => {
    expect(parse("")).toEqual(defaults);
  });

  it("reads every filter with the API names", () => {
    expect(
      parse("search=notebook&status=open&priority=high&sort=created_at&page=3"),
    ).toEqual({
      search: "notebook",
      status: "open",
      priority: "high",
      sort: "created_at",
      page: 3,
    });
  });

  it("trims the search", () => {
    expect(parse("search=%20%20notebook%20").search).toBe("notebook");
  });

  it.each(["foo", "OPEN", "Aberta"])("drops the invalid status %s", (value) => {
    expect(parse(`status=${value}`).status).toBe("");
  });

  it("drops an invalid priority", () => {
    expect(parse("priority=urgent").priority).toBe("");
  });

  it("falls back to the default sort for an unknown sort", () => {
    expect(parse("sort=title").sort).toBe("-created_at");
  });

  it.each(["0", "-1", "abc", "1.5", "", "1e3", "99999999999999999999"])(
    "falls back to page 1 for the invalid page %j",
    (value) => {
      expect(parse(`page=${value}`).page).toBe(1);
    },
  );
});

describe("toSearchParams", () => {
  it("keeps the defaults out of the URL", () => {
    expect(toSearchParams(defaults).toString()).toBe("");
  });

  it("writes only the active filters", () => {
    const params = toSearchParams({
      ...defaults,
      status: "approved",
      sort: "created_at",
      page: 2,
    });

    expect(params.get("status")).toBe("approved");
    expect(params.get("sort")).toBe("created_at");
    expect(params.get("page")).toBe("2");
    expect(params.has("search")).toBe(false);
    expect(params.has("priority")).toBe(false);
  });

  it("is the inverse of parseFilters", () => {
    const filters: InternalRequestFilters = {
      search: "novo notebook",
      status: "in_review",
      priority: "low",
      sort: "created_at",
      page: 4,
    };

    expect(parse(toSearchParams(filters).toString())).toEqual(filters);
    expect(parse(toSearchParams(defaults).toString())).toEqual(defaults);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the defaults, even with another sort or page", () => {
    expect(hasActiveFilters(defaults)).toBe(false);
    expect(hasActiveFilters({ ...defaults, sort: "created_at", page: 3 })).toBe(
      false,
    );
  });

  it.each([
    { search: "x" },
    { status: "open" as const },
    { priority: "high" as const },
  ])("is true with %j", (patch) => {
    expect(hasActiveFilters({ ...defaults, ...patch })).toBe(true);
  });
});
