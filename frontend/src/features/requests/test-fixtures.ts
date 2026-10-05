import type {
  InternalRequest,
  PaginationMeta,
} from "@/features/requests/types";

export function makeRequest(
  overrides: Partial<InternalRequest> = {},
): InternalRequest {
  return {
    id: 10,
    title: "Notebook novo",
    description: "Substituir o equipamento atual",
    priority: "medium",
    status: "open",
    requester: { id: 1, name: "Ana Souza" },
    area: { id: 2, name: "Financeiro" },
    assigned_to: null,
    assigned_at: null,
    decision: null,
    history: [
      {
        from_status: null,
        to_status: "open",
        changed_by: { id: 1, name: "Ana Souza" },
        created_at: "2026-10-03T13:00:00.000000Z",
      },
    ],
    created_at: "2026-10-03T13:00:00.000000Z",
    can: { update: true, delete: true },
    ...overrides,
  };
}

export function makeMeta(
  overrides: Partial<PaginationMeta> = {},
): PaginationMeta {
  return {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 1,
    from: 1,
    to: 1,
    ...overrides,
  };
}
