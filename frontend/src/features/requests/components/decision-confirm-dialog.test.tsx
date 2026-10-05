import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decideInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import {
  DecisionConfirmDialog,
  type DecisionKind,
} from "./decision-confirm-dialog";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onClose = vi.fn();
const onInvalid = vi.fn();
const onRefresh = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  decideInternalRequest: vi.fn(),
}));

const decide = vi.mocked(decideInternalRequest);

function renderDialog(decision: DecisionKind | null = "approve") {
  return render(
    <DecisionConfirmDialog
      requestId={10}
      decision={decision}
      justification="Dentro do orçamento"
      onClose={onClose}
      onInvalid={onInvalid}
      onRefresh={onRefresh}
    />,
  );
}

describe("DecisionConfirmDialog", () => {
  beforeEach(() => {
    [decide, toastSuccess, toastError, onClose, onInvalid, onRefresh].forEach(
      (m) => m.mockReset(),
    );
  });

  it("renders nothing while there is no pending decision", () => {
    renderDialog(null);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the approve copy with the justification quoted", () => {
    renderDialog("approve");

    expect(screen.getByText("Aprovar esta solicitação?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A decisão fica registrada com esta justificativa e não pode ser alterada depois.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Dentro do orçamento").tagName).toBe("BLOCKQUOTE");
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
  });

  it("shows the reject copy", () => {
    renderDialog("reject");

    expect(screen.getByText("Rejeitar esta solicitação?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rejeitar" }),
    ).toBeInTheDocument();
  });

  it("cancels without calling the API", async () => {
    renderDialog("approve");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(decide).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it.each([
    ["approve", "Aprovar", "Solicitação aprovada"],
    ["reject", "Rejeitar", "Solicitação rejeitada"],
  ] as const)(
    "confirms %s: calls the API, shows the toast and reloads",
    async (decision, label, toastText) => {
      decide.mockResolvedValue(makeRequest());
      renderDialog(decision);

      await userEvent.click(screen.getByRole("button", { name: label }));

      await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
      expect(decide).toHaveBeenCalledWith(10, decision, "Dentro do orçamento");
      expect(toastSuccess).toHaveBeenCalledWith(toastText);
      expect(onClose).toHaveBeenCalled();
    },
  );

  it("disables both buttons and shows 'Aprovando…' while sending, without closing", async () => {
    decide.mockImplementation(() => new Promise(() => {}));
    renderDialog("approve");

    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(
      await screen.findByRole("button", { name: "Aprovando…" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows 'Rejeitando…' while rejecting", async () => {
    decide.mockImplementation(() => new Promise(() => {}));
    renderDialog("reject");

    await userEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    expect(
      await screen.findByRole("button", { name: "Rejeitando…" }),
    ).toBeDisabled();
  });

  it("on 409 shows the API message, closes and reloads", async () => {
    decide.mockRejectedValue(new ApiError(409, "Este pedido já foi decidido."));
    renderDialog("approve");

    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível decidir",
      expect.objectContaining({ description: "Este pedido já foi decidido." }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("on 422 closes and sends the field error back to the form, with no toast", async () => {
    decide.mockRejectedValue(
      new ApiError(422, "Dados inválidos", {
        justification: ["O campo justificativa é obrigatório."],
      }),
    );
    renderDialog("reject");

    await userEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    await waitFor(() =>
      expect(onInvalid).toHaveBeenCalledWith(
        "O campo justificativa é obrigatório.",
      ),
    );
    expect(onClose).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it.each([401, 419])(
    "on %s shows no toast and does not reload",
    async (status) => {
      decide.mockRejectedValue(new ApiError(status, "Sessão expirada"));
      renderDialog("approve");

      await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

      await waitFor(() => expect(decide).toHaveBeenCalled());
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(toastError).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
      expect(onInvalid).not.toHaveBeenCalled();
    },
  );

  it("on a network error shows the generic toast and does not reload", async () => {
    decide.mockRejectedValue(new TypeError("network"));
    renderDialog("approve");

    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][1]).toEqual({
      description: "Não foi possível concluir a ação. Tente novamente.",
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
