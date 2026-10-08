import { SEARCH_MAX } from "@/features/requests/filters";
import { accountStatuses, roles } from "@/features/users/labels";
import type { UserFilters } from "@/features/users/types";

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

// `area_id` is only valid when the area exists: `areaIds` are the known ones.
function parseAreaId(value: string | null, areaIds: number[]): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return areaIds.includes(id) ? id : null;
}

export function parseUserFilters(
  searchParams: Pick<URLSearchParams, "get">,
  areaIds: number[],
): UserFilters {
  return {
    search: (searchParams.get("search")?.trim() ?? "").slice(0, SEARCH_MAX),
    role: pick(searchParams.get("role"), roles) ?? "",
    area_id: parseAreaId(searchParams.get("area_id"), areaIds),
    status: pick(searchParams.get("status"), accountStatuses) ?? "",
    page: parsePage(searchParams.get("page")),
  };
}

// Defaults stay out of the URL.
export function toUserSearchParams(filters: UserFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.area_id !== null) params.set("area_id", String(filters.area_id));
  if (filters.status) params.set("status", filters.status);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function hasActiveUserFilters(filters: UserFilters): boolean {
  return (
    filters.search !== "" ||
    filters.role !== "" ||
    filters.area_id !== null ||
    filters.status !== ""
  );
}
