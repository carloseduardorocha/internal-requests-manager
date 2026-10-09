import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeMeta } from "@/features/requests/test-fixtures";
import { api } from "@/lib/api";

import {
  bulkDeactivateUsers,
  bulkReactivateUsers,
  deactivateUser,
  listAreas,
  listUsers,
  reactivateUser,
  updateUser,
} from "./api";
import { makeArea, makeUser } from "./test-fixtures";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("users api", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it("lists with every filter as query and returns the paginated body", async () => {
    const body = { data: [makeUser()], meta: makeMeta() };
    vi.mocked(api.get).mockResolvedValue(body);
    const filters = {
      search: "ca",
      role: "analyst" as const,
      area_id: 2,
      status: "active" as const,
      page: 2,
    };

    await expect(listUsers(filters)).resolves.toEqual(body);
    expect(api.get).toHaveBeenCalledWith("/api/users", { query: filters });
  });

  it("posts the ids to the bulk endpoints and returns the result", async () => {
    const result = {
      done: [2],
      skipped: [{ id: 3, reason: "self", message: "Sua própria conta." }],
    };
    vi.mocked(api.post).mockResolvedValue({ data: result });

    await expect(bulkDeactivateUsers([2, 3])).resolves.toEqual(result);
    expect(api.post).toHaveBeenCalledWith("/api/users/bulk/deactivate", {
      ids: [2, 3],
    });

    await expect(bulkReactivateUsers([4])).resolves.toEqual(result);
    expect(api.post).toHaveBeenCalledWith("/api/users/bulk/reactivate", {
      ids: [4],
    });
  });

  it("reads the data envelope on the areas", async () => {
    const areas = [makeArea({ id: 1 }), makeArea({ id: 2, name: "TI" })];
    vi.mocked(api.get).mockResolvedValue({ data: areas });

    await expect(listAreas()).resolves.toEqual(areas);
    expect(api.get).toHaveBeenCalledWith("/api/areas");
  });

  it("updates with PATCH on the user and unwraps data", async () => {
    const user = makeUser({ name: "Novo" });
    vi.mocked(api.patch).mockResolvedValue({ data: user });
    const payload = { name: "Novo", area_id: 3, role: "admin" as const };

    await expect(updateUser(7, payload)).resolves.toEqual(user);
    expect(api.patch).toHaveBeenCalledWith("/api/users/7", payload);
  });

  it("deactivates with POST on the deactivate route and unwraps data", async () => {
    const user = makeUser({ status: "deactivated" });
    vi.mocked(api.post).mockResolvedValue({ data: user });

    await expect(deactivateUser(7)).resolves.toEqual(user);
    expect(api.post).toHaveBeenCalledWith("/api/users/7/deactivate");
  });

  it("reactivates with POST on the reactivate route and unwraps data", async () => {
    const user = makeUser({ status: "active" });
    vi.mocked(api.post).mockResolvedValue({ data: user });

    await expect(reactivateUser(7)).resolves.toEqual(user);
    expect(api.post).toHaveBeenCalledWith("/api/users/7/reactivate");
  });

  it("lets a failure of the API reach the caller", async () => {
    const failure = new Error("boom");
    vi.mocked(api.patch).mockRejectedValue(failure);

    await expect(updateUser(7, { name: "A", area_id: 1 })).rejects.toBe(
      failure,
    );
  });
});
