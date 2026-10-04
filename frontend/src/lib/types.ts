// Mirrors the API payloads (docs/api.md), snake_case included.
export type Role = "requester" | "analyst" | "admin";

export type Area = {
  id: number;
  name: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  area: Area;
};

export type ApiValidationErrors = Record<string, string[]>;
