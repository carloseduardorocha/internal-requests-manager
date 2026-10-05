import {
  DEFAULT_SORT,
  priorities,
  sorts,
  statuses,
} from "@/features/requests/labels";
import type { InternalRequestFilters } from "@/features/requests/types";

// The API validates `search` with max:255.
export const SEARCH_MAX = 255;

// Anything that is not a valid value falls back to the default, so a URL
// edited by hand never reaches the API as a 422.
function pick<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return allowed.find((item) => item === value) ?? null;
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseFilters(
  searchParams: Pick<URLSearchParams, "get">,
): InternalRequestFilters {
  return {
    search: (searchParams.get("search")?.trim() ?? "").slice(0, SEARCH_MAX),
    status: pick(searchParams.get("status"), statuses) ?? "",
    priority: pick(searchParams.get("priority"), priorities) ?? "",
    sort: pick(searchParams.get("sort"), sorts) ?? DEFAULT_SORT,
    page: parsePage(searchParams.get("page")),
  };
}

// Defaults stay out of the URL.
export function toSearchParams(
  filters: InternalRequestFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function hasActiveFilters(filters: InternalRequestFilters): boolean {
  return (
    filters.search !== "" || filters.status !== "" || filters.priority !== ""
  );
}
