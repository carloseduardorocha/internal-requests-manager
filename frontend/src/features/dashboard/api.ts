import type { Dashboard } from "@/features/dashboard/types";
import { api } from "@/lib/api";

export function getDashboard(): Promise<Dashboard> {
  return api.get<Dashboard>("/api/dashboard");
}
