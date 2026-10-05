import type {
  InternalRequestPriority,
  InternalRequestStatus,
} from "@/features/requests/types";

// Mirrors GET /api/dashboard (docs/api.md, section 4): every key is always present.
export type Dashboard = {
  total: number;
  by_status: Record<InternalRequestStatus, number>;
  by_priority: Record<InternalRequestPriority, number>;
};
