import type { Invitation, InvitationInput } from "@/features/users/types";
import { api, getCsrfCookie } from "@/lib/api";
import type { Area, User } from "@/lib/types";

export async function listAreas(): Promise<Area[]> {
  const { data } = await api.get<{ data: Area[] }>("/api/areas");
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
