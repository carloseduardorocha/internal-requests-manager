import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteInternalRequest } from "@/features/requests/api";
import { ApiError } from "@/lib/api";

import { DeleteRequestDialog } from "./delete-request-dialog";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onRefresh = vi.fn();
const onDeleted = vi.fn();
const onOpenChange = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  deleteInternalRequest: vi.fn(),
}));

const remove = vi.mocked(deleteInternalRequest);

async function openDialog() {
  const ui = userEvent.setup();
  render(
    <DeleteRequestDialog
      request={{ id: 10, title: "Notebook novo" }}
      open
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
      onRefresh={onRefresh}
    />,
  );
  const dialog = await screen.findByRole("alertdialog");
  return { ui, dialog };
}

describe("DeleteRequestDialog", () => {
  beforeEach(() => {
    remove.mockReset();
    onDeleted.mockReset();
    onOpenChange.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    onRefresh.mockReset();
  });

  it("asks for confirmation and does not call the API on open", async () => {
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByText("Excluir esta solicitação?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Notebook novo/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it("cancels without calling the API", async () => {
    const { ui, dialog } = await openDialog();

    await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(remove).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("deletes on confirm, tells the screen and closes", async () => {
    remove.mockResolvedValue(undefined);
    const { ui, dialog } = await openDialog();

    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(10);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("on 409 shows the API message, reloads the screen and does not leave it", async () => {
    remove.mockRejectedValue(
      new ApiError(
        409,
        "Este pedido não está mais Aberto e não pode ser alterado.",
      ),
    );
    const { ui, dialog } = await openDialog();

    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível excluir",
      expect.objectContaining({
        description:
          "Este pedido não está mais Aberto e não pode ser alterado.",
      }),
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("on other errors shows a toast without reloading", async () => {
    remove.mockRejectedValue(new ApiError(500, "Erro interno"));
    const { ui, dialog } = await openDialog();

    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("shows a generic message when the failure is not an ApiError", async () => {
    remove.mockRejectedValue(new TypeError("network"));
    const { ui, dialog } = await openDialog();

    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][1]).toEqual({
      description: "Não foi possível concluir a ação. Tente novamente.",
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it.each([401, 419])(
    "on %s (expired session) shows no toast: the API client already redirects",
    async (status) => {
      remove.mockRejectedValue(new ApiError(status, "Sessão expirada"));
      const { ui, dialog } = await openDialog();

      await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(remove).toHaveBeenCalled());
      expect(toastError).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
    },
  );
});
