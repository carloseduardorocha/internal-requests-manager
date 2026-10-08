import type { Area, Role } from "@/lib/types";

export type InvitationInput = {
  name: string;
  email: string;
  role: Role;
  area_id: number;
};

export type Invitation = {
  name: string;
  email: string;
  role: Role;
  area: Area;
  expires_at: string;
};
