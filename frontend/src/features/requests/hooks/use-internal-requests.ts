"use client";

import { useCallback, useEffect, useState } from "react";

import { listInternalRequests } from "@/features/requests/api";
import type {
  InternalRequest,
  InternalRequestFilters,
  PaginationMeta,
} from "@/features/requests/types";

type Result = {
  key: string;
  data: InternalRequest[];
  meta: PaginationMeta | null;
  failed: boolean;
};

// The list for the given filters. `loading` is derived: it is true while the
// stored result belongs to other filters (or to a run before `reload`).
export function useInternalRequests(filters: InternalRequestFilters) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${attempt}:${JSON.stringify(filters)}`;

  useEffect(() => {
    let active = true;

    listInternalRequests(filters)
      .then(({ data, meta }) => {
        if (active) setResult({ key, data, meta, failed: false });
      })
      .catch(() => {
        if (active) setResult({ key, data: [], meta: null, failed: true });
      });

    return () => {
      active = false;
    };
    // `key` already carries the filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const ready = result !== null && result.key === key;

  return {
    loading: !ready,
    error: ready && result.failed,
    data: ready ? result.data : [],
    meta: ready ? result.meta : null,
    reload,
  };
}
