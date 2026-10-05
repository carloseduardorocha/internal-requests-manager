// Route ids are numeric: anything else is a request that cannot exist, so the
// screens show "not found" without calling the API.
export function isValidRequestId(id: string): boolean {
  return /^\d+$/.test(id);
}
