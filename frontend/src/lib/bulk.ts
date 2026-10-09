// The result of a bulk action (docs/api.md): what went through and what was
// left out, with the API's message for each one.
export type BulkSkipped = { id: number; reason: string; message: string };

export type BulkResult = { done: number[]; skipped: BulkSkipped[] };
