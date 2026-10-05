import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listInternalRequests } from "@/features/requests/api";
import { makeMeta, makeRequest } from "@/features/requests/test-fixtures";
import type { InternalRequestFilters } from "@/features/requests/types";

import { useInternalRequests } from "./use-internal-requests";

vi.mock("@/features/requests/api", () => ({
  listInternalRequests: vi.fn(),
}));

const list = vi.mocked(listInternalRequests);

const filters: InternalRequestFilters = {
  search: "notebook",
  status: "open",
  priority: "high",
  sort: "created_at",
  page: 2,
};

describe("useInternalRequests", () => {
  beforeEach(() => {
    list.mockReset();
  });

  it("starts loading and then exposes data and meta", async () => {
    const meta = makeMeta({ total: 1 });
    list.mockResolvedValue({ data: [makeRequest()], meta });

    const { result } = renderHook(() => useInternalRequests(filters));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.meta).toEqual(meta);
  });

  it("sends all the active filters together in one call", async () => {
    list.mockResolvedValue({ data: [], meta: makeMeta({ total: 0 }) });

    const { result } = renderHook(() => useInternalRequests(filters));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(filters);
  });

  it("reports an error when the call fails", async () => {
    list.mockImplementation(() => Promise.reject(new Error("boom")));

    const { result } = renderHook(() => useInternalRequests(filters));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it("goes back to loading and refetches when the filters change", async () => {
    list.mockResolvedValue({ data: [], meta: makeMeta({ total: 0 }) });

    const { result, rerender } = renderHook(({ f }) => useInternalRequests(f), {
      initialProps: { f: filters },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ f: { ...filters, page: 3 } });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenLastCalledWith({ ...filters, page: 3 });
  });

  it("does not refetch when the filters are equal but a new object", async () => {
    list.mockResolvedValue({ data: [], meta: makeMeta({ total: 0 }) });

    const { result, rerender } = renderHook(({ f }) => useInternalRequests(f), {
      initialProps: { f: filters },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ f: { ...filters } });

    expect(result.current.loading).toBe(false);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("reload fetches again and clears a previous error", async () => {
    list.mockRejectedValueOnce(new Error("boom"));
    list.mockResolvedValueOnce({ data: [makeRequest()], meta: makeMeta() });

    const { result } = renderHook(() => useInternalRequests(filters));
    await waitFor(() => expect(result.current.error).toBe(true));

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe(false);
    expect(result.current.data).toHaveLength(1);
  });
});
