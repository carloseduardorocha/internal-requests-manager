import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

import {
  createInternalRequest,
  deleteInternalRequest,
  getInternalRequest,
  listInternalRequests,
  updateInternalRequest,
} from "./api";
import { makeMeta, makeRequest } from "./test-fixtures";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const payload = {
  title: "Notebook",
  description: "Preciso de um",
  priority: "high" as const,
};

describe("internal requests api", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it("lists with every filter as query and returns the paginated body", async () => {
    const body = { data: [makeRequest()], meta: makeMeta() };
    vi.mocked(api.get).mockResolvedValue(body);
    const filters = {
      search: "a",
      status: "open" as const,
      priority: "low" as const,
      sort: "created_at" as const,
      page: 2,
    };

    await expect(listInternalRequests(filters)).resolves.toEqual(body);
    expect(api.get).toHaveBeenCalledWith("/api/internal-requests", {
      query: filters,
    });
  });

  it("reads the data envelope on the detail", async () => {
    const request = makeRequest({ id: 7 });
    vi.mocked(api.get).mockResolvedValue({ data: request });

    await expect(getInternalRequest("7")).resolves.toEqual(request);
    expect(api.get).toHaveBeenCalledWith("/api/internal-requests/7");
  });

  it("posts the payload and returns the created request", async () => {
    const created = makeRequest({ id: 11 });
    vi.mocked(api.post).mockResolvedValue({ data: created });

    await expect(createInternalRequest(payload)).resolves.toEqual(created);
    expect(api.post).toHaveBeenCalledWith("/api/internal-requests", payload);
  });

  it("patches the three fields and returns the updated request", async () => {
    const updated = makeRequest({ id: 5 });
    vi.mocked(api.patch).mockResolvedValue({ data: updated });

    await expect(updateInternalRequest(5, payload)).resolves.toEqual(updated);
    expect(api.patch).toHaveBeenCalledWith("/api/internal-requests/5", payload);
  });

  it("deletes by id", async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await expect(deleteInternalRequest(5)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/api/internal-requests/5");
  });
});
