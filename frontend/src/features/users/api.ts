import type {
  ManagedUser,
  UserFilters,
  UserUpdatePayload,
} from "@/features/users/types";
import type { Paginated } from "@/features/requests/types";
import { api } from "@/lib/api";
import type { Area } from "@/lib/types";

const BASE_PATH = "/api/users";

export function listUsers(
  filters: UserFilters,
): Promise<Paginated<ManagedUser>> {
  // The client already drops empty values.
  return api.get<Paginated<ManagedUser>>(BASE_PATH, { query: filters });
}

export async function listAreas(): Promise<Area[]> {
  const { data } = await api.get<{ data: Area[] }>("/api/areas");
  return data;
}

export async function updateUser(
  id: number,
  payload: UserUpdatePayload,
): Promise<ManagedUser> {
  const { data } = await api.patch<{ data: ManagedUser }>(
    `${BASE_PATH}/${id}`,
    payload,
  );
  return data;
}

export async function deactivateUser(id: number): Promise<ManagedUser> {
  const { data } = await api.post<{ data: ManagedUser }>(
    `${BASE_PATH}/${id}/deactivate`,
  );
  return data;
}

export async function reactivateUser(id: number): Promise<ManagedUser> {
  const { data } = await api.post<{ data: ManagedUser }>(
    `${BASE_PATH}/${id}/reactivate`,
  );
  return data;
}
