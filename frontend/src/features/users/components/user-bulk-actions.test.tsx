import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bulkDeactivateUsers, bulkReactivateUsers } from "@/features/users/api";
import { makeUser } from "@/features/users/test-fixtures";
import type { ManagedUser } from "@/features/users/types";
import { ApiError } from "@/lib/api";

import { UserBulkActions } from "./user-bulk-actions";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onClear = vi.fn();
const onStart = vi.fn();
const onDone = vi.fn();
const onForbidden = vi.fn();
const onFocusFallback = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/users/api", () => ({
  bulkDeactivateUsers: vi.fn(),
  bulkReactivateUsers: vi.fn(),
}));

const deactivate = vi.mocked(bulkDeactivateUsers);
const reactivate = vi.mocked(bulkReactivateUsers);

const carla = makeUser({ id: 7, name: "Carla Dias" });
const bruno = makeUser({ id: 8, name: "Bruno Lima" });
const pedro = makeUser({
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

function setup(users: ManagedUser[]) {
  const ui = userEvent.setup();
  render(
    <UserBulkActions
      users={users}
      onClear={onClear}
      onStart={onStart}
      onDone={onDone}
      onForbidden={onForbidden}
      onFocusFallback={onFocusFallback}
    />,
  );
  return ui;
}

const deactivateButton = () =>
  screen.queryByRole("button", { name: "Desativar" });
const reactivateButton = () =>
  screen.queryByRole("button", { name: "Reativar" });

describe("UserBulkActions", () => {
  beforeEach(() => {
    deactivate.mockReset();
    reactivate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    onClear.mockReset();
    onStart.mockReset();
    onDone.mockReset();
    onForbidden.mockReset();
    onFocusFallback.mockReset();
  });

  describe("which actions the bar offers", () => {
    it("shows nothing when no account is selected", () => {
      setup([]);

      expect(
        screen.queryByRole("region", { name: "Ações em massa" }),
      ).not.toBeInTheDocument();
    });

    it("offers only Desativar for active accounts", () => {
      setup([carla, bruno]);

      expect(
        screen.getByRole("region", { name: "Ações em massa" }),
      ).toBeInTheDocument();
      expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
      expect(deactivateButton()).toBeInTheDocument();
      expect(reactivateButton()).not.toBeInTheDocument();
    });

    it("offers only Reativar for deactivated accounts", () => {
      setup([pedro]);

      expect(reactivateButton()).toBeInTheDocument();
      expect(deactivateButton()).not.toBeInTheDocument();
    });

    it("offers both for a mixed selection", () => {
      setup([carla, pedro]);

      expect(deactivateButton()).toBeInTheDocument();
      expect(reactivateButton()).toBeInTheDocument();
    });

    it("clears the selection from the bar", async () => {
      const ui = setup([carla]);

      await ui.click(screen.getByRole("button", { name: "Limpar seleção" }));

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("deactivating", () => {
    it("asks to confirm with the count before calling the API", async () => {
      const ui = setup([carla, bruno]);

      await ui.click(deactivateButton()!);

      const dialog = await screen.findByRole("alertdialog");
      expect(
        within(dialog).getByText("Desativar 2 contas?"),
      ).toBeInTheDocument();
      expect(deactivate).not.toHaveBeenCalled();
    });

    it("names the account when only one is selected", async () => {
      const ui = setup([carla]);

      await ui.click(deactivateButton()!);

      const dialog = await screen.findByRole("alertdialog");
      expect(
        within(dialog).getByText("Desativar Carla Dias?"),
      ).toBeInTheDocument();
    });

    it("does not call the API when the confirmation is cancelled", async () => {
      const ui = setup([carla, bruno]);

      await ui.click(deactivateButton()!);
      const dialog = await screen.findByRole("alertdialog");
      await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(deactivate).not.toHaveBeenCalled();
      expect(onDone).not.toHaveBeenCalled();
    });

    it("sends all the selected ids once confirmed and reports the result with the names", async () => {
      const result = { done: [7, 8], skipped: [] };
      deactivate.mockResolvedValue(result);
      const ui = setup([carla, bruno, pedro]);

      await ui.click(deactivateButton()!);
      const dialog = await screen.findByRole("alertdialog");
      await ui.click(within(dialog).getByRole("button", { name: "Desativar" }));

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(deactivate).toHaveBeenCalledWith([7, 8, 9]);
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith(result, "deactivate", {
        7: "Carla Dias",
        8: "Bruno Lima",
        9: "Pedro Inativo",
      });
      expect(reactivate).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("reactivating", () => {
    it("calls the API right away, without confirmation", async () => {
      const result = { done: [9], skipped: [] };
      reactivate.mockResolvedValue(result);
      const ui = setup([pedro]);

      await ui.click(reactivateButton()!);

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(reactivate).toHaveBeenCalledWith([9]);
      expect(deactivate).not.toHaveBeenCalled();
      expect(onDone).toHaveBeenCalledWith(result, "reactivate", {
        9: "Pedro Inativo",
      });
    });

    it("sends every selected id, including the ones that are not deactivated", async () => {
      reactivate.mockResolvedValue({ done: [9], skipped: [] });
      const ui = setup([carla, pedro]);

      await ui.click(reactivateButton()!);

      await waitFor(() => expect(reactivate).toHaveBeenCalledWith([7, 9]));
    });
  });

  describe("while the call is running", () => {
    it("disables the bar and keeps the dialog open on Escape, with Cancelar disabled", async () => {
      deactivate.mockReturnValue(new Promise(() => {}));
      const ui = setup([carla, pedro]);
      await ui.click(screen.getByRole("button", { name: "Desativar" }));
      const dialog = await screen.findByRole("alertdialog");

      await ui.click(within(dialog).getByRole("button", { name: "Desativar" }));

      await waitFor(() =>
        expect(
          within(dialog).getByRole("button", { name: "Cancelar" }),
        ).toBeDisabled(),
      );
      await ui.keyboard("{Escape}");
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      const bar = screen.getByRole("region", {
        name: "Ações em massa",
        hidden: true,
      });
      for (const button of within(bar).getAllByRole("button", {
        hidden: true,
      })) {
        expect(button).toBeDisabled();
      }
    });
  });

  describe("errors", () => {
    async function failDeactivating(error: unknown) {
      deactivate.mockRejectedValue(error);
      const ui = setup([carla, bruno]);
      await ui.click(deactivateButton()!);
      const dialog = await screen.findByRole("alertdialog");
      await ui.click(within(dialog).getByRole("button", { name: "Desativar" }));
    }

    it("shows the API message in a toast and asks the page to clear and reload on 403", async () => {
      await failDeactivating(
        new ApiError(403, "Você não tem permissão para fazer isso."),
      );

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível desativar",
        expect.objectContaining({
          description: "Você não tem permissão para fazer isso.",
        }),
      );
      expect(onForbidden).toHaveBeenCalledTimes(1);
      expect(onDone).not.toHaveBeenCalled();
    });

    it("shows a toast and keeps the selection on a generic error", async () => {
      await failDeactivating(new ApiError(500, "Erro no servidor."));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível desativar",
        expect.objectContaining({ description: "Erro no servidor." }),
      );
      expect(onForbidden).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onDone).not.toHaveBeenCalled();
    });

    it("shows a fallback toast when the error is not from the API", async () => {
      await failDeactivating(new Error("network"));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível desativar",
        expect.objectContaining({
          description: "Não foi possível concluir a ação. Tente novamente.",
        }),
      );
    });

    it("shows no toast on 401", async () => {
      await failDeactivating(new ApiError(401, "Não autenticado."));

      await waitFor(() => expect(deactivate).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(toastError).not.toHaveBeenCalled();
      expect(onDone).not.toHaveBeenCalled();
    });

    it("titles the toast for reactivating", async () => {
      reactivate.mockRejectedValue(new ApiError(500, "Erro no servidor."));
      const ui = setup([pedro]);

      await ui.click(reactivateButton()!);

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          "Não foi possível reativar",
          expect.objectContaining({ description: "Erro no servidor." }),
        ),
      );
    });
  });
});
