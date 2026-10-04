import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/lib/types";

import Index from "./page";

const replace = vi.fn();
let role: Role = "requester";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { role } }),
}));

describe("Index", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("sends the requester to /requests", () => {
    role = "requester";
    render(<Index />);

    expect(replace).toHaveBeenCalledWith("/requests");
  });

  it("sends the analyst to /dashboard", () => {
    role = "analyst";
    render(<Index />);

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });
});
