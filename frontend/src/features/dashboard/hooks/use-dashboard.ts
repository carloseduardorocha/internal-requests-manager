"use client";

import { useCallback, useEffect, useState } from "react";

import { getDashboard } from "@/features/dashboard/api";
import type { Dashboard } from "@/features/dashboard/types";

type Result = { attempt: number; data: Dashboard | null };

// The dashboard numbers. `loading` is derived: it is true until the result of
// the current attempt arrives (a late answer to an older attempt is ignored).
export function useDashboard() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((data) => {
        if (active) setResult({ attempt, data });
      })
      .catch(() => {
        if (active) setResult({ attempt, data: null });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const ready = result !== null && result.attempt === attempt;

  return {
    loading: !ready,
    error: ready && result.data === null,
    data: ready ? result.data : null,
    reload,
  };
}
