import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reactivateUser } from "@/features/users/api";
import { makeArea, makeUser } from "@/features/users/test-fixtures";

import { UserRowActions } from "./user-row-actions";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/features/users/api", () => ({
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

const reactivate = vi.mocked(reactivateUser);
const user = makeUser({ id: 9, name: "Pedro Inativo" });

function setup(target = user) {
  const ui = userEvent.setup();
  render(
    <UserRowActions user={target} areas={[makeArea()]} onUpdated={vi.fn()} />,
  );
  return ui;
}

const trigger = () =>
  screen.getByRole("button", { name: "Ações de Pedro Inativo" });

describe("UserRowActions focus", () => {
  beforeEach(() => reactivate.mockReset());

  it("gives the focus back to the menu button when the edit dialog closes", async () => {
    const ui = setup();

    await ui.click(trigger());
    await ui.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("gives the focus back to the menu button when the confirmation closes", async () => {
    const ui = setup();

    await ui.click(trigger());
    await ui.click(await screen.findByRole("menuitem", { name: "Desativar" }));
    await ui.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(trigger()).toHaveFocus();
  });

  it("gives the focus back to the menu button after reactivating", async () => {
    reactivate.mockResolvedValue(makeUser({ id: 9 }));
    const ui = setup(
      makeUser({
        id: 9,
        name: "Pedro Inativo",
        status: "deactivated",
        can: {
          update: true,
          change_role: true,
          deactivate: false,
          reactivate: true,
        },
      }),
    );

    await ui.click(trigger());
    await ui.click(await screen.findByRole("menuitem", { name: "Reativar" }));

    await waitFor(() => expect(trigger()).toHaveFocus());
  });
});
