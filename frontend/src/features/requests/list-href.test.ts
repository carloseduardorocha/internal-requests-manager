import { afterEach, describe, expect, it, vi } from "vitest";

import { listHref, saveListQuery } from "./list-href";

describe("list href", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("is the plain list when nothing was saved", () => {
    expect(listHref()).toBe("/requests");
  });

  it("brings back the saved query", () => {
    saveListQuery("status=open&page=2");

    expect(listHref()).toBe("/requests?status=open&page=2");
  });

  it("forgets the query when the list has no filters", () => {
    saveListQuery("status=open");
    saveListQuery("");

    expect(listHref()).toBe("/requests");
  });

  it("falls back to the plain list when the storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveListQuery("status=open")).not.toThrow();
    expect(listHref()).toBe("/requests");
  });
});
