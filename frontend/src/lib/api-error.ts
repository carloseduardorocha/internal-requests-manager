import { ApiError } from "@/lib/api";

const FALLBACK = "Não foi possível concluir a ação. Tente novamente.";

// The text to show for a failed call, or null for an expired session (the API
// client is already sending the user to the login).
export function failureMessage(error: unknown): string | null {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 419) return null;
    return error.message;
  }
  return FALLBACK;
}
