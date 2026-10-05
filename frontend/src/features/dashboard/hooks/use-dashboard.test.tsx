import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboard } from "@/features/dashboard/api";
import { makeDashboard } from "@/features/dashboard/test-fixtures";
import type { Dashboard } from "@/features/dashboard/types";

import { useDashboard } from "./use-dashboard";

vi.mock("@/features/dashboard/api", () => ({ getDashboard: vi.fn() }));

const get = vi.mocked(getDashboard);

function deferred() {
  let resolve!: (value: Dashboard) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Dashboard>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useDashboard", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("loads on mount", async () => {
    const data = makeDashboard();
    get.mockResolvedValue(data);
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(data);
    expect(result.current.error).toBe(false);
  });

  it("reports an error when the call fails", async () => {
    get.mockImplementation(() => Promise.reject(new Error("boom")));
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("ignores a late response from a previous call after reload", async () => {
    const first = deferred();
    const second = deferred();
    get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useDashboard());

    act(() => result.current.reload());
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

    const stale = makeDashboard({ total: 1 });
    const fresh = makeDashboard({ total: 99 });
    await act(async () => {
      second.resolve(fresh);
    });
    await act(async () => {
      first.resolve(stale);
    });

    expect(result.current.data).toBe(fresh);
  });

  it("ignores a late failure from a previous call after reload", async () => {
    const first = deferred();
    const second = deferred();
    get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useDashboard());

    act(() => result.current.reload());
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

    const fresh = makeDashboard({ total: 5 });
    await act(async () => {
      second.resolve(fresh);
    });
    await act(async () => {
      first.reject(new Error("late"));
    });

    expect(result.current.error).toBe(false);
    expect(result.current.data).toBe(fresh);
  });
});
