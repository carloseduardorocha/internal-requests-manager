import type {
  Invitation,
  InvitationInput,
  ManagedUser,
  UserFilters,
  UserUpdatePayload,
} from "@/features/users/types";
import type { Paginated } from "@/features/requests/types";
import { api, getCsrfCookie } from "@/lib/api";
import type { Area, User } from "@/lib/types";

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

export async function createInvitation(
  input: InvitationInput,
): Promise<Invitation> {
  const { data } = await api.post<{ data: Invitation }>(
    "/api/invitations",
    input,
  );
  return data;
}

// The invitation token is a secret: it only travels in the URL and the path.
export async function getInvitation(token: string): Promise<Invitation> {
  const { data } = await api.get<{ data: Invitation }>(
    `/api/invitations/${encodeURIComponent(token)}`,
    { redirectOnAuthError: false },
  );
  return data;
}

export type AcceptInvitationInput = {
  password: string;
  password_confirmation: string;
};

export async function acceptInvitation(
  token: string,
  input: AcceptInvitationInput,
): Promise<User> {
  await getCsrfCookie();

  const { data } = await api.post<{ data: User }>(
    `/api/invitations/${encodeURIComponent(token)}/accept`,
    input,
    { redirectOnAuthError: false },
  );
  return data;
}
