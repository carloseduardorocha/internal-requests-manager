import type { Role } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  requester: "Solicitante",
  analyst: "Analista",
  admin: "Administrador",
};

export const roleDescriptions: Record<Role, string> = {
  requester: "Abre e acompanha os próprios pedidos",
  analyst: "Assume, decide e vê o painel",
  admin: "Tudo, sobre qualquer pedido, e convida pessoas",
};

// Display order: from the least to the most access.
export const roles: Role[] = ["requester", "analyst", "admin"];
