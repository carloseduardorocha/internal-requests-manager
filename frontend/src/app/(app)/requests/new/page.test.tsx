import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireRole } from "@/features/auth/require-role";
import type { Role } from "@/lib/types";

import NewRequestPage from "./page";

const replace = vi.fn();
let role: Role = "requester";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/requests/new",
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { role } }),
}));

vi.mock("@/features/requests/api", () => ({
  createInternalRequest: vi.fn(),
  updateInternalRequest: vi.fn(),
}));

// The (app) layout wraps every page in RequireRole.
function renderGuarded() {
  return render(
    <RequireRole>
      <NewRequestPage />
    </RequireRole>,
  );
}

describe("NewRequestPage", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it.each(["requester", "admin"] as const)(
    "shows the form to the %s",
    (value) => {
      role = value;
      renderGuarded();

      expect(
        screen.getByRole("heading", { level: 1, name: "Nova solicitação" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Título")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Criar solicitação" }),
      ).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it("sends the analyst to their home without rendering the form", () => {
    role = "analyst";
    renderGuarded();

    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Nova solicitação" }),
    ).not.toBeInTheDocument();
  });

  it("links back to the list", () => {
    role = "requester";
    renderGuarded();

    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/requests");
  });
});
