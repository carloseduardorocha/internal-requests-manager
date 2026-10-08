import type { Area, Role } from "@/lib/types";

// Mirrors the API payloads (docs/api.md, section 7), snake_case included.
export type AccountStatus = "active" | "deactivated";

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  area: Area;
  status: AccountStatus;
  deactivated_at: string | null;
  created_at: string;
  // What the administrator can do with this account (own account: no
  // change_role and no deactivate).
  can: {
    update: boolean;
    change_role: boolean;
    deactivate: boolean;
    reactivate: boolean;
  };
};

// "" and null mean "no filter". The same names go in the URL and in the API query.
export type UserFilters = {
  search: string;
  role: Role | "";
  area_id: number | null;
  status: AccountStatus | "";
  page: number;
};

export type UserUpdatePayload = {
  name: string;
  area_id: number;
  role?: Role;
};
