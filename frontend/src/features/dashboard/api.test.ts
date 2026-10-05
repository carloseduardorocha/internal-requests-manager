import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

import { getDashboard } from "./api";
import { makeDashboard } from "./test-fixtures";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));

describe("dashboard api", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("calls GET /api/dashboard and returns the body as it came, without envelope", async () => {
    const body = makeDashboard();
    vi.mocked(api.get).mockResolvedValue(body);

    await expect(getDashboard()).resolves.toBe(body);
    expect(api.get).toHaveBeenCalledWith("/api/dashboard");
  });
});
