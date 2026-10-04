import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/lib/types";

import { RequireRole } from "./require-role";

const replace = vi.fn();
let pathname = "/dashboard";
let role: Role = "requester";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { role } }),
}));

describe("RequireRole", () => {
  beforeEach(() => {
    replace.mockReset();
    pathname = "/dashboard";
  });

  it("sends the requester from /dashboard to /requests without rendering it", () => {
    role = "requester";
    render(
      <RequireRole>
        <p>conteudo</p>
      </RequireRole>,
    );

    expect(replace).toHaveBeenCalledWith("/requests");
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it.each(["analyst", "admin"] as const)("keeps %s on /dashboard", (value) => {
    role = value;
    render(
      <RequireRole>
        <p>conteudo</p>
      </RequireRole>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });

  it("keeps the requester on /requests", () => {
    role = "requester";
    pathname = "/requests/1";
    render(
      <RequireRole>
        <p>conteudo</p>
      </RequireRole>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });
});
