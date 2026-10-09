import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bulkAssignInternalRequests,
  bulkDeleteInternalRequests,
} from "@/features/requests/api";
import { ApiError } from "@/lib/api";
import type { BulkResult } from "@/lib/bulk";
import type { Role } from "@/lib/types";

import { BulkRequestActions } from "./bulk-request-actions";

const toastError = vi.fn();
const onBusyChange = vi.fn();
const onResult = vi.fn();
const onForbidden = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  bulkAssignInternalRequests: vi.fn(),
  bulkDeleteInternalRequests: vi.fn(),
}));

const bulkDelete = vi.mocked(bulkDeleteInternalRequests);
const bulkAssign = vi.mocked(bulkAssignInternalRequests);

const result: BulkResult = { done: [1, 2], skipped: [] };

function setup(role: Role, ids = [1, 2], busy = false) {
  const ui = userEvent.setup();
  render(
    <BulkRequestActions
      role={role}
      ids={ids}
      busy={busy}
      onBusyChange={onBusyChange}
      onResult={onResult}
      onForbidden={onForbidden}
    />,
  );
  return ui;
}

describe("BulkRequestActions", () => {
  beforeEach(() => {
    bulkDelete.mockReset();
    bulkAssign.mockReset();
    onBusyChange.mockReset();
    onResult.mockReset();
    onForbidden.mockReset();
    toastError.mockReset();
  });

  describe("buttons by role", () => {
    it("shows only Excluir to the requester", () => {
      setup("requester");

      expect(screen.getByRole("button", { name: "Excluir" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Assumir" })).toBeNull();
    });

    it("shows only Assumir to the analyst", () => {
      setup("analyst");

      expect(screen.getByRole("button", { name: "Assumir" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
    });

    it("shows both to the admin", () => {
      setup("admin");

      expect(screen.getByRole("button", { name: "Assumir" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Excluir" })).toBeVisible();
    });

    it("disables the buttons while busy", () => {
      setup("admin", [1], true);

      expect(screen.getByRole("button", { name: "Assumir" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
    });
  });

  describe("delete", () => {
    it("asks first and does not call the API before the confirmation", async () => {
      const ui = setup("requester", [1, 2, 3]);

      await ui.click(screen.getByRole("button", { name: "Excluir" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(
        within(dialog).getByText("Excluir 3 solicitações?"),
      ).toBeInTheDocument();
      expect(bulkDelete).not.toHaveBeenCalled();
    });

    it("uses the singular for one request", async () => {
      const ui = setup("requester", [1]);

      await ui.click(screen.getByRole("button", { name: "Excluir" }));

      expect(
        await screen.findByText("Excluir 1 solicitação?"),
      ).toBeInTheDocument();
    });

    it("warns that only Open requests the person can delete go away", async () => {
      const ui = setup("requester");

      await ui.click(screen.getByRole("button", { name: "Excluir" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent(/Abertas/);
      expect(dialog).toHaveTextContent(/resumo/);
    });

    it("Cancelar closes without calling the API", async () => {
      const ui = setup("requester");
      await ui.click(screen.getByRole("button", { name: "Excluir" }));
      const dialog = await screen.findByRole("alertdialog");

      await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(bulkDelete).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
    });

    it("confirming calls the API with the ids and hands over the result", async () => {
      bulkDelete.mockResolvedValue(result);
      const ui = setup("requester", [4, 5]);
      await ui.click(screen.getByRole("button", { name: "Excluir" }));
      const dialog = await screen.findByRole("alertdialog");

      await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
      expect(bulkDelete).toHaveBeenCalledWith([4, 5]);
      expect(onResult).toHaveBeenCalledWith("delete", result);
      expect(bulkAssign).not.toHaveBeenCalled();
      expect(onBusyChange).toHaveBeenNthCalledWith(1, true);
      expect(onBusyChange).toHaveBeenLastCalledWith(false);
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    });
  });

  describe("assign", () => {
    it("does not ask for confirmation: calls the API at once", async () => {
      bulkAssign.mockResolvedValue(result);
      const ui = setup("analyst", [7, 8]);

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
      await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
      expect(bulkAssign).toHaveBeenCalledWith([7, 8]);
      expect(onResult).toHaveBeenCalledWith("assign", result);
      expect(bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("on 401 shows no toast and does not call onForbidden", async () => {
      bulkAssign.mockRejectedValue(new ApiError(401, "Não autenticado"));
      const ui = setup("analyst");

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
      expect(toastError).not.toHaveBeenCalled();
      expect(onForbidden).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
    });

    it("on 419 shows no toast either", async () => {
      bulkAssign.mockRejectedValue(new ApiError(419, "Sessão expirada"));
      const ui = setup("analyst");

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
      expect(toastError).not.toHaveBeenCalled();
    });

    it("on 403 shows the API message and calls onForbidden", async () => {
      bulkAssign.mockRejectedValue(new ApiError(403, "Sem permissão."));
      const ui = setup("analyst");

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível assumir",
        expect.objectContaining({ description: "Sem permissão." }),
      );
      expect(onResult).not.toHaveBeenCalled();
    });

    it("on 403 of a delete, titles the toast as an excluir failure", async () => {
      bulkDelete.mockRejectedValue(new ApiError(403, "Sem permissão."));
      const ui = setup("requester");
      await ui.click(screen.getByRole("button", { name: "Excluir" }));
      const dialog = await screen.findByRole("alertdialog");

      await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível excluir",
        expect.objectContaining({ description: "Sem permissão." }),
      );
    });

    it("on a network error shows a toast, keeps the screen and frees the bar", async () => {
      bulkAssign.mockRejectedValue(new TypeError("network"));
      const ui = setup("analyst");

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError.mock.calls[0][1]).toEqual({
        description: "Não foi possível concluir a ação. Tente novamente.",
      });
      expect(onForbidden).not.toHaveBeenCalled();
      expect(onResult).not.toHaveBeenCalled();
      expect(onBusyChange).toHaveBeenLastCalledWith(false);
    });
  });
});
