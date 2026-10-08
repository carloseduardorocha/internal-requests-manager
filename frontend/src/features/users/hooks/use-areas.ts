"use client";

import { useCallback, useEffect, useState } from "react";

import { listAreas } from "@/features/users/api";
import type { Area } from "@/lib/types";

type Result = { attempt: number; areas: Area[]; failed: boolean };

// The areas, loaded once (and again on `reload`). `loading` is derived: it is
// true until the stored result belongs to the current attempt.
export function useAreas() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let active = true;

    listAreas()
      .then((areas) => {
        if (active) setResult({ attempt, areas, failed: false });
      })
      .catch(() => {
        if (active) setResult({ attempt, areas: [], failed: true });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const ready = result !== null && result.attempt === attempt;

  return {
    loading: !ready,
    error: ready && result.failed,
    areas: ready ? result.areas : [],
    reload,
  };
}
