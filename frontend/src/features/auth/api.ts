import { api, getCsrfCookie } from "@/lib/api";
import type { User } from "@/lib/types";

export type LoginInput = {
  email: string;
  password: string;
  remember: boolean;
};

export async function login(input: LoginInput): Promise<User> {
  await getCsrfCookie();

  const { data } = await api.post<{ data: User }>("/api/login", input, {
    redirectOnAuthError: false,
  });
  return data;
}

export async function logout(): Promise<void> {
  // The session may already be gone: a 401/419 must not bounce to "expired".
  await api.post("/api/logout", undefined, { redirectOnAuthError: false });
}

export async function me(): Promise<User> {
  const { data } = await api.get<{ data: User }>("/api/me");
  return data;
}
