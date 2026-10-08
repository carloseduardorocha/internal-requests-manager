import type { AccountStatus } from "@/features/users/types";
import type { Role } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  requester: "Solicitante",
  analyst: "Analista",
  admin: "Administrador",
};

export const roles: Role[] = ["requester", "analyst", "admin"];

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: "Ativa",
  deactivated: "Desativada",
};

// The filter speaks of accounts in the plural.
export const accountStatusFilterLabels: Record<AccountStatus, string> = {
  active: "Ativas",
  deactivated: "Desativadas",
};

export const accountStatuses: AccountStatus[] = ["active", "deactivated"];
