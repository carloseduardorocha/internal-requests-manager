import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/auth-provider";
import { UserMenu } from "@/features/auth/components/user-menu";
import { makeMeta } from "@/features/requests/test-fixtures";
import { listAreas, listUsers, updateUser } from "@/features/users/api";
import { makeArea, makeUser } from "@/features/users/test-fixtures";

import UsersPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/users",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/features/auth/api", () => ({
  me: () =>
    Promise.resolve({
      id: 1,
      name: "Maria Admin",
      email: "maria@empresa.com",
      role: "admin",
      area: { id: 1, name: "TI" },
    }),
  logout: vi.fn(),
}));

vi.mock("@/features/users/api", () => ({
  listUsers: vi.fn(),
  listAreas: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

describe("editing the own account", () => {
  it("updates the name shown in the header", async () => {
    const area = makeArea({ id: 1, name: "TI" });
    const mine = makeUser({
      id: 1,
      name: "Maria Admin",
      email: "maria@empresa.com",
      role: "admin",
      area,
      can: {
        update: true,
        change_role: false,
        deactivate: false,
        reactivate: false,
      },
    });
    vi.mocked(listAreas).mockResolvedValue([area]);
    vi.mocked(listUsers).mockResolvedValue({
      data: [mine],
      meta: makeMeta(),
    });
    vi.mocked(updateUser).mockResolvedValue({ ...mine, name: "Maria Souza" });

    const ui = userEvent.setup();
    render(
      <AuthProvider>
        <UserMenu />
        <UsersPage />
      </AuthProvider>,
    );

    await ui.click(
      await screen.findByRole("button", { name: "Ações de Maria Admin" }),
    );
    await ui.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const name = await screen.findByLabelText("Nome");
    await ui.clear(name);
    await ui.type(name, "Maria Souza");
    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Menu da conta de Maria Souza" }),
      ).toBeInTheDocument(),
    );
  });
});
