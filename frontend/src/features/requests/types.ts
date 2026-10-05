import type { Area } from "@/lib/types";

// Mirrors the API payloads (docs/api.md, section 2), snake_case included.
export type InternalRequestStatus =
  "open" | "in_review" | "approved" | "rejected";

export type InternalRequestPriority = "low" | "medium" | "high";

export type UserSummary = {
  id: number;
  name: string;
};

export type StatusChange = {
  from_status: InternalRequestStatus | null;
  to_status: InternalRequestStatus;
  changed_by: UserSummary;
  created_at: string;
};

export type Decision = {
  decided_by: UserSummary;
  decided_at: string;
  justification: string;
};

export type InternalRequest = {
  id: number;
  title: string;
  description: string;
  priority: InternalRequestPriority;
  status: InternalRequestStatus;
  requester: UserSummary;
  area: Area;
  assigned_to: UserSummary | null;
  assigned_at: string | null;
  decision: Decision | null;
  // Only on the detail (the list does not bring it).
  history?: StatusChange[];
  created_at: string;
  can: { update: boolean; delete: boolean };
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

// Laravel's default paginator: `links` is not used by the screens.
export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type InternalRequestSort = "created_at" | "-created_at";

// "" means "no filter". The same names go in the URL and in the API query.
export type InternalRequestFilters = {
  search: string;
  status: InternalRequestStatus | "";
  priority: InternalRequestPriority | "";
  sort: InternalRequestSort;
  page: number;
};

export type InternalRequestPayload = {
  title: string;
  description: string;
  priority: InternalRequestPriority;
};
