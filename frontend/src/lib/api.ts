import type { ApiValidationErrors } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const EXPIRED_LOGIN_PATH = "/login?expired=1";

export class ApiError extends Error {
  status: number;
  errors: ApiValidationErrors;
  // Seconds, from the Retry-After header (null when absent).
  retryAfter: number | null;

  constructor(
    status: number,
    message: string,
    errors: ApiValidationErrors = {},
    retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  // Set to false for calls where 401/419 is an expected answer (the login).
  redirectOnAuthError?: boolean;
};

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const pair = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));

  return pair ? decodeURIComponent(pair.slice(prefix.length)) : null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return `${BASE_URL}${path}${queryString ? `?${queryString}` : ""}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function getCsrfCookie(): Promise<void> {
  await api("/sanctum/csrf-cookie", { redirectOnAuthError: false });
}

export async function api<T = undefined>(
  path: string,
  { method = "GET", body, query, redirectOnAuthError = true }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (method !== "GET") {
    const token = readCookie("XSRF-TOKEN");
    if (token) headers["X-XSRF-TOKEN"] = token;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await readBody(response);

  if (!response.ok) {
    if (
      redirectOnAuthError &&
      (response.status === 401 || response.status === 419)
    ) {
      // Outside React, so the router is not available: a hard navigation also resets state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(EXPIRED_LOGIN_PATH);
    }

    const data = (payload ?? {}) as {
      message?: string;
      errors?: ApiValidationErrors;
    };
    const retryAfter = Number.parseInt(
      response.headers.get("Retry-After") ?? "",
      10,
    );

    throw new ApiError(
      response.status,
      data.message ?? "Não foi possível concluir a ação. Tente novamente.",
      data.errors ?? {},
      Number.isNaN(retryAfter) ? null : retryAfter,
    );
  }

  return payload as T;
}

api.get = <T = undefined>(
  path: string,
  options?: Omit<ApiOptions, "method" | "body">,
) => api<T>(path, { ...options, method: "GET" });

api.post = <T = undefined>(
  path: string,
  body?: unknown,
  options?: Omit<ApiOptions, "method" | "body">,
) => api<T>(path, { ...options, method: "POST", body });

api.patch = <T = undefined>(
  path: string,
  body?: unknown,
  options?: Omit<ApiOptions, "method" | "body">,
) => api<T>(path, { ...options, method: "PATCH", body });

api.delete = <T = undefined>(
  path: string,
  options?: Omit<ApiOptions, "method" | "body">,
) => api<T>(path, { ...options, method: "DELETE" });
