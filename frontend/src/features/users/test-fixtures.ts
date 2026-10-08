import type { ManagedUser } from "@/features/users/types";
import type { Area } from "@/lib/types";

export function makeArea(overrides: Partial<Area> = {}): Area {
  return { id: 2, name: "Financeiro", ...overrides };
}

export function makeUser(overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id: 7,
    name: "Carla Dias",
    email: "carla.dias@empresa.com",
    role: "analyst",
    area: makeArea(),
    status: "active",
    deactivated_at: null,
    created_at: "2026-10-03T13:00:00.000000Z",
    can: {
      update: true,
      change_role: true,
      deactivate: true,
      reactivate: false,
    },
    ...overrides,
  };
}
