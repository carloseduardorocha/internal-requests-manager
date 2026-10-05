import type {
  InternalRequest,
  InternalRequestFilters,
  InternalRequestPayload,
  Paginated,
} from "@/features/requests/types";
import { api } from "@/lib/api";

const BASE_PATH = "/api/internal-requests";

export function listInternalRequests(
  filters: InternalRequestFilters,
): Promise<Paginated<InternalRequest>> {
  // The client already drops empty values.
  return api.get<Paginated<InternalRequest>>(BASE_PATH, { query: filters });
}

export async function getInternalRequest(id: string): Promise<InternalRequest> {
  const { data } = await api.get<{ data: InternalRequest }>(
    `${BASE_PATH}/${id}`,
  );
  return data;
}

export async function createInternalRequest(
  payload: InternalRequestPayload,
): Promise<InternalRequest> {
  const { data } = await api.post<{ data: InternalRequest }>(
    BASE_PATH,
    payload,
  );
  return data;
}

export async function updateInternalRequest(
  id: number,
  payload: InternalRequestPayload,
): Promise<InternalRequest> {
  const { data } = await api.patch<{ data: InternalRequest }>(
    `${BASE_PATH}/${id}`,
    payload,
  );
  return data;
}

export function deleteInternalRequest(id: number): Promise<undefined> {
  return api.delete(`${BASE_PATH}/${id}`);
}
