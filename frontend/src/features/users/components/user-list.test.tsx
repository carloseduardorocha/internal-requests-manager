import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reactivateUser } from "@/features/users/api";
import { makeArea, makeUser } from "@/features/users/test-fixtures";
import type { ManagedUser } from "@/features/users/types";
import { ApiError } from "@/lib/api";

import { UserList } from "./user-list";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onUpdated = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock("@/features/users/api", () => ({
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

const reactivate = vi.mocked(reactivateUser);
const areas = [makeArea()];

const ownAccount = makeUser({
  id: 1,
  name: "Maria Admin",
  email: "maria@empresa.com",
  role: "admin",
  can: {
    update: true,
    change_role: false,
    deactivate: false,
    reactivate: false,
  },
});

const deactivated = makeUser({
  id: 9,
  name: "Pedro Inativo",
  status: "deactivated",
  deactivated_at: "2026-10-04T10:00:00.000000Z",
  can: {
    update: true,
    change_role: true,
    deactivate: false,
    reactivate: true,
  },
});

const selection = {
  isSelected: () => false,
  onToggle: vi.fn(),
  allSelected: false,
  someSelected: false,
  onToggleAll: vi.fn(),
};

function setup(users: ManagedUser[]) {
  const ui = userEvent.setup();
  render(
    <UserList
      users={users}
      areas={areas}
      selection={selection}
      onUpdated={onUpdated}
    />,
  );
  return ui;
}

async function openMenu(ui: ReturnType<typeof userEvent.setup>, name: string) {
  await ui.click(screen.getByRole("button", { name: `Ações de ${name}` }));
  return screen.findByRole("menu");
}

describe("UserList", () => {
  beforeEach(() => {
    reactivate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    onUpdated.mockReset();
  });

  it("shows name, e-mail, role, area and status of each account", () => {
    setup([makeUser({ name: "Carla Dias", role: "analyst" })]);

    expect(screen.getByText("Carla Dias")).toBeInTheDocument();
    expect(screen.getByText("carla.dias@empresa.com")).toBeInTheDocument();
    expect(screen.getByText("Analista")).toBeInTheDocument();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });

  it("toggles 'select all' from the visible text next to the checkbox", async () => {
    selection.onToggleAll.mockClear();
    const ui = setup([makeUser()]);

    await ui.click(screen.getByText("Selecionar todas desta página"));

    expect(selection.onToggleAll).toHaveBeenCalledTimes(1);
  });

  it("marks only the own account with 'Você'", () => {
    setup([ownAccount, makeUser({ id: 7, name: "Carla Dias" })]);

    expect(screen.getAllByText("Você")).toHaveLength(1);
    const row = screen.getByText("Maria Admin").closest("div");
    expect(row).toHaveTextContent("Você");
    expect(screen.getByText("Carla Dias").closest("div")).not.toHaveTextContent(
      "Você",
    );
  });

  it("shows the status badge of each situation", () => {
    setup([makeUser({ id: 7, name: "Ativo" }), deactivated]);

    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Desativada")).toBeInTheDocument();
  });

  describe("selection", () => {
    it("gives every row a checkbox except the own account", () => {
      setup([ownAccount, makeUser({ id: 7, name: "Carla Dias" }), deactivated]);

      expect(
        screen.queryByRole("checkbox", { name: "Selecionar Maria Admin" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "Selecionar Carla Dias" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "Selecionar Pedro Inativo" }),
      ).toBeInTheDocument();
    });

    it("has a 'select all' checkbox in the header", () => {
      setup([ownAccount, makeUser({ id: 7 })]);

      expect(
        screen.getByRole("checkbox", { name: "Selecionar todas desta página" }),
      ).toBeInTheDocument();
    });

    it("reflects the selection received from the page", () => {
      render(
        <UserList
          users={[ownAccount, makeUser({ id: 7, name: "Carla Dias" })]}
          areas={areas}
          selection={{ ...selection, isSelected: (id) => id === 7 }}
          onUpdated={onUpdated}
        />,
      );

      expect(
        screen.getByRole("checkbox", { name: "Selecionar Carla Dias" }),
      ).toBeChecked();
    });

    it("reports the toggles to the page", async () => {
      const ui = setup([ownAccount, makeUser({ id: 7, name: "Carla Dias" })]);

      await ui.click(
        screen.getByRole("checkbox", { name: "Selecionar Carla Dias" }),
      );
      expect(selection.onToggle).toHaveBeenCalledWith(7);

      await ui.click(
        screen.getByRole("checkbox", { name: "Selecionar todas desta página" }),
      );
      expect(selection.onToggleAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("row menu", () => {
    it("offers Editar and Desativar to an active account", async () => {
      const ui = setup([makeUser()]);

      const menu = await openMenu(ui, "Carla Dias");

      expect(
        within(menu).getByRole("menuitem", { name: "Editar" }),
      ).toBeVisible();
      expect(
        within(menu).getByRole("menuitem", { name: "Desativar" }),
      ).toBeVisible();
      expect(
        within(menu).queryByRole("menuitem", { name: "Reativar" }),
      ).not.toBeInTheDocument();
    });

    it("offers only Editar on the own account", async () => {
      const ui = setup([ownAccount]);

      const menu = await openMenu(ui, "Maria Admin");

      expect(within(menu).getAllByRole("menuitem")).toHaveLength(1);
      expect(
        within(menu).getByRole("menuitem", { name: "Editar" }),
      ).toBeVisible();
    });

    it("offers Reativar and no Desativar to a deactivated account", async () => {
      const ui = setup([deactivated]);

      const menu = await openMenu(ui, "Pedro Inativo");

      expect(
        within(menu).getByRole("menuitem", { name: "Reativar" }),
      ).toBeVisible();
      expect(
        within(menu).queryByRole("menuitem", { name: "Desativar" }),
      ).not.toBeInTheDocument();
    });

    it("hides the actions the API does not allow", async () => {
      const ui = setup([
        makeUser({
          can: {
            update: false,
            change_role: false,
            deactivate: false,
            reactivate: false,
          },
        }),
      ]);

      const menu = await openMenu(ui, "Carla Dias");

      expect(within(menu).queryAllByRole("menuitem")).toHaveLength(0);
    });

    it("opens the edit dialog from Editar", async () => {
      const ui = setup([makeUser()]);

      const menu = await openMenu(ui, "Carla Dias");
      await ui.click(within(menu).getByRole("menuitem", { name: "Editar" }));

      expect(await screen.findByRole("dialog")).toHaveTextContent(
        "Editar usuário",
      );
    });

    it("asks for confirmation from Desativar", async () => {
      const ui = setup([makeUser()]);

      const menu = await openMenu(ui, "Carla Dias");
      await ui.click(within(menu).getByRole("menuitem", { name: "Desativar" }));

      expect(await screen.findByRole("alertdialog")).toHaveTextContent(
        "Desativar Carla Dias?",
      );
    });

    it("reactivates straight from the menu, with no confirmation", async () => {
      const back = { ...deactivated, status: "active" as const };
      reactivate.mockResolvedValue(back);
      const ui = setup([deactivated]);

      const menu = await openMenu(ui, "Pedro Inativo");
      await ui.click(within(menu).getByRole("menuitem", { name: "Reativar" }));

      await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(back));
      expect(reactivate).toHaveBeenCalledWith(9);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(toastSuccess).toHaveBeenCalledWith(
        "Conta reativada",
        expect.anything(),
      );
    });

    it("shows an error toast when reactivating fails and keeps the row as it was", async () => {
      reactivate.mockRejectedValue(new ApiError(500, "Erro interno"));
      const ui = setup([deactivated]);

      const menu = await openMenu(ui, "Pedro Inativo");
      await ui.click(within(menu).getByRole("menuitem", { name: "Reativar" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível reativar",
        expect.objectContaining({ description: "Erro interno" }),
      );
      expect(onUpdated).not.toHaveBeenCalled();
      expect(toastSuccess).not.toHaveBeenCalled();
    });
  });
});
