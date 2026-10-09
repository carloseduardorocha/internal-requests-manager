import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import type { InternalRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api";

import { RequestRowActions } from "./request-row-actions";

const toastError = vi.fn();
const onDeleted = vi.fn();
const onRefresh = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  deleteInternalRequest: vi.fn(),
}));

const remove = vi.mocked(deleteInternalRequest);

async function openMenu(request: InternalRequest) {
  const ui = userEvent.setup();
  render(
    <RequestRowActions
      request={request}
      onDeleted={onDeleted}
      onRefresh={onRefresh}
    />,
  );
  await ui.click(
    screen.getByRole("button", {
      name: `Ações de #${request.id} ${request.title}`,
    }),
  );
  await screen.findByRole("menu");
  return ui;
}

const can = (update: boolean, del: boolean) => ({
  update,
  delete: del,
  assign: false,
  approve: false,
  reject: false,
});

describe("RequestRowActions", () => {
  beforeEach(() => {
    remove.mockReset();
    onDeleted.mockReset();
    onRefresh.mockReset();
    toastError.mockReset();
  });

  it("labels the menu button with the id and the title", () => {
    render(
      <RequestRowActions
        request={makeRequest({ id: 128, title: "Licença do Power BI" })}
        onDeleted={onDeleted}
        onRefresh={onRefresh}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ações de #128 Licença do Power BI" }),
    ).toBeInTheDocument();
  });

  it("shows Visualizar, Editar and Excluir for an Open request the person can change", async () => {
    await openMenu(makeRequest({ id: 10, can: can(true, true) }));

    expect(
      screen.getByRole("menuitem", { name: "Visualizar" }),
    ).toHaveAttribute("href", "/requests/10");
    expect(screen.getByRole("menuitem", { name: "Editar" })).toHaveAttribute(
      "href",
      "/requests/10/edit",
    );
    expect(
      screen.getByRole("menuitem", { name: "Excluir" }),
    ).toBeInTheDocument();
  });

  it("shows only Visualizar when the request is not Open (can.update and can.delete false)", async () => {
    await openMenu(
      makeRequest({ status: "in_review", can: can(false, false) }),
    );

    expect(
      screen.getByRole("menuitem", { name: "Visualizar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
  });

  it("does not show Excluir to someone who cannot delete (the analyst)", async () => {
    await openMenu(makeRequest({ can: can(false, false) }));

    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: "Visualizar" }),
    ).toBeInTheDocument();
  });

  it("follows each flag on its own", async () => {
    await openMenu(makeRequest({ can: can(true, false) }));

    expect(
      screen.getByRole("menuitem", { name: "Editar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
  });

  it("never offers 'Assumir' in the menu", async () => {
    await openMenu(
      makeRequest({
        can: {
          update: true,
          delete: true,
          assign: true,
          approve: false,
          reject: false,
        },
      }),
    );

    expect(screen.queryByRole("menuitem", { name: /Assumir/ })).toBeNull();
  });

  it("opens the confirmation on Excluir without calling the API", async () => {
    const ui = await openMenu(makeRequest({ title: "Notebook novo" }));

    await ui.click(screen.getByRole("menuitem", { name: "Excluir" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Excluir esta solicitação?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Notebook novo/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const ui = await openMenu(makeRequest());
    await ui.click(screen.getByRole("menuitem", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");

    await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(remove).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("deletes on confirm and calls onDeleted", async () => {
    remove.mockResolvedValue(undefined);
    const ui = await openMenu(makeRequest({ id: 10 }));
    await ui.click(screen.getByRole("menuitem", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");

    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith(10);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("on 409 shows the API message and reloads the list", async () => {
    remove.mockRejectedValue(
      new ApiError(
        409,
        "Este pedido não está mais Aberto e não pode ser alterado.",
      ),
    );
    const ui = await openMenu(makeRequest());
    await ui.click(screen.getByRole("menuitem", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");

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

  it("gives the focus back to the menu button when the confirmation closes", async () => {
    const ui = await openMenu(makeRequest({ id: 10, title: "Notebook novo" }));
    await ui.click(screen.getByRole("menuitem", { name: "Excluir" }));
    await screen.findByRole("alertdialog");

    await ui.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(
      screen.getByRole("button", { name: "Ações de #10 Notebook novo" }),
    ).toHaveFocus();
  });
});
