import type { InternalRequestStatus } from "@/features/requests/types";

// Plural, for the cards (`statusLabels` in the requests feature is singular).
export const statusCardLabels: Record<InternalRequestStatus, string> = {
  open: "Abertas",
  in_review: "Em Análise",
  approved: "Aprovadas",
  rejected: "Rejeitadas",
};
