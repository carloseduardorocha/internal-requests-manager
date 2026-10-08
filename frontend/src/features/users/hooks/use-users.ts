"use client";

import { useCallback, useEffect, useState } from "react";

import type { PaginationMeta } from "@/features/requests/types";
import { listUsers } from "@/features/users/api";
import type { ManagedUser, UserFilters } from "@/features/users/types";

type Result = {
  key: string;
  data: ManagedUser[];
  meta: PaginationMeta | null;
  failed: boolean;
};

// The list for the given filters. `loading` is derived: it is true while the
// stored result belongs to other filters (or to a run before `reload`).
export function useUsers(filters: UserFilters) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${attempt}:${JSON.stringify(filters)}`;

  useEffect(() => {
    let active = true;

    listUsers(filters)
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

  // Swaps an account in the stored result (after an edit, deactivation or
  // reactivation) without reloading: the row stays until the next search.
  const replace = useCallback((user: ManagedUser) => {
    setResult((current) =>
      current === null
        ? current
        : {
            ...current,
            data: current.data.map((item) =>
              item.id === user.id ? user : item,
            ),
          },
    );
  }, []);

  const ready = result !== null && result.key === key;

  return {
    loading: !ready,
    error: ready && result.failed,
    data: ready ? result.data : [],
    meta: ready ? result.meta : null,
    reload,
    replace,
  };
}
