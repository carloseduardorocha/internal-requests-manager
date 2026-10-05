import type { Dashboard } from "@/features/dashboard/types";

export function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    total: 23,
    by_status: { open: 8, in_review: 6, approved: 6, rejected: 3 },
    by_priority: { low: 6, medium: 10, high: 7 },
    ...overrides,
  };
}

export const emptyDashboard: Dashboard = {
  total: 0,
  by_status: { open: 0, in_review: 0, approved: 0, rejected: 0 },
  by_priority: { low: 0, medium: 0, high: 0 },
};
