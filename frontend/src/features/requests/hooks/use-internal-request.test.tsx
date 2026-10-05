import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import { useInternalRequest } from "./use-internal-request";

vi.mock("@/features/requests/api", () => ({
  getInternalRequest: vi.fn(),
}));

const get = vi.mocked(getInternalRequest);

describe("useInternalRequest", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("loads the request by id", async () => {
    get.mockResolvedValue(makeRequest({ id: 7 }));

    const { result } = renderHook(() => useInternalRequest("7"));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(get).toHaveBeenCalledWith("7");
    expect(result.current.data?.id).toBe(7);
    expect(result.current.error).toBe(false);
    expect(result.current.notFound).toBe(false);
  });

  it("tells a 404 apart from other errors", async () => {
    get.mockImplementation(() =>
      Promise.reject(new ApiError(404, "Não encontrado")),
    );

    const { result } = renderHook(() => useInternalRequest("999"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("flags other failures as error but not as notFound", async () => {
    get.mockImplementation(() => Promise.reject(new ApiError(500, "boom")));

    const { result } = renderHook(() => useInternalRequest("7"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.notFound).toBe(false);
  });

  it("reload fetches again", async () => {
    get.mockResolvedValue(makeRequest());

    const { result } = renderHook(() => useInternalRequest("10"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(get).toHaveBeenCalledTimes(2);
  });

  it("refetches when the id changes", async () => {
    get.mockResolvedValue(makeRequest());

    const { result, rerender } = renderHook(
      ({ id }) => useInternalRequest(id),
      {
        initialProps: { id: "1" },
      },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ id: "2" });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(get).toHaveBeenLastCalledWith("2");
  });
});
