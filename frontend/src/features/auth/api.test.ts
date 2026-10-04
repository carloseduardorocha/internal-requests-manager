import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { logout } from "./api";

const assign = vi.fn();
const fetchMock = vi.fn();

describe("logout", () => {
  beforeEach(() => {
    assign.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([401, 419])(
    "rejects on %i without redirecting to the expired page",
    async (status) => {
      fetchMock.mockImplementation(
        async () => new Response(JSON.stringify({}), { status }),
      );

      await expect(logout()).rejects.toBeInstanceOf(ApiError);

      expect(assign).not.toHaveBeenCalled();
    },
  );
});
