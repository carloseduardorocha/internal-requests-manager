"use client";

import { useCallback, useEffect, useState } from "react";

import { getInternalRequest } from "@/features/requests/api";
import type { InternalRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api";

type Result = {
  key: string;
  id: string;
  data: InternalRequest | null;
  notFound: boolean;
};

// One request by id. `error` is true for any failure; `notFound` tells the
// 404 apart, because it gets its own screen.
export function useInternalRequest(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${attempt}:${id}`;

  useEffect(() => {
    let active = true;

    getInternalRequest(id)
      .then((data) => {
        if (active) setResult({ key, id, data, notFound: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const notFound = error instanceof ApiError && error.status === 404;
        setResult({ key, id, data: null, notFound });
      });

    return () => {
      active = false;
    };
    // `key` already carries the id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const ready = result !== null && result.key === key;

  return {
    loading: !ready,
    error: ready && result.data === null,
    notFound: ready && result.notFound,
    // While reloading the same request, the previous data stays: the screen
    // keeps its place (and the focus) instead of going back to a skeleton.
    data: result !== null && result.id === id ? result.data : null,
    reload,
  };
}
