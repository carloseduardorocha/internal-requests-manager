import type {
  InternalRequestPriority,
  InternalRequestSort,
  InternalRequestStatus,
} from "@/features/requests/types";

export const statusLabels: Record<InternalRequestStatus, string> = {
  open: "Aberta",
  in_review: "Em Análise",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

// "Alta" first, as in the mockup filters and form.
export const priorityLabels: Record<InternalRequestPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const sortLabels: Record<InternalRequestSort, string> = {
  "-created_at": "Mais recentes",
  created_at: "Mais antigas",
};

export const statuses = Object.keys(statusLabels) as InternalRequestStatus[];
export const priorities = Object.keys(
  priorityLabels,
) as InternalRequestPriority[];
export const sorts = Object.keys(sortLabels) as InternalRequestSort[];

export const DEFAULT_SORT: InternalRequestSort = "-created_at";
