import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decideInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import { DecisionForm } from "./decision-form";

const onRefresh = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/features/requests/api", () => ({
  decideInternalRequest: vi.fn(),
}));

const decide = vi.mocked(decideInternalRequest);

function renderForm(can = {}) {
  const request = makeRequest({
    status: "in_review",
    can: {
      update: false,
      delete: false,
      assign: false,
      approve: true,
      reject: true,
      ...can,
    },
  });
  return render(<DecisionForm request={request} onRefresh={onRefresh} />);
}

describe("DecisionForm", () => {
  beforeEach(() => {
    decide.mockReset();
    onRefresh.mockReset();
  });

  it("shows the help text and the field limit", () => {
    renderForm();

    const field = screen.getByLabelText("Justificativa");
    expect(field).toHaveAttribute("maxlength", "10000");
    expect(
      screen.getByText(
        "O solicitante vê a justificativa. A decisão não pode ser alterada depois.",
      ),
    ).toBeInTheDocument();
  });

  it.each(["Aprovar", "Rejeitar"])(
    "'%s' with an empty field shows the error, focuses the field and opens nothing",
    async (name) => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name }));

      const field = screen.getByLabelText("Justificativa");
      expect(
        screen.getByText("O campo justificativa é obrigatório."),
      ).toBeInTheDocument();
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveFocus();
      expect(field).toHaveAccessibleDescription(
        "O campo justificativa é obrigatório.",
      );
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it("treats a field with only spaces as empty", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Justificativa"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(
      screen.getByText("O campo justificativa é obrigatório."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it("shows the length error above 10.000 characters", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Justificativa"), {
      target: { value: "a".repeat(10001) },
    });
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(
      screen.getByText("A justificativa deve ter no máximo 10.000 caracteres."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it("accepts exactly 10.000 characters", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Justificativa"), {
      target: { value: "a".repeat(10000) },
    });
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("clears the error when the user types again", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await userEvent.type(screen.getByLabelText("Justificativa"), "ok");

    expect(
      screen.queryByText("O campo justificativa é obrigatório."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Justificativa")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("opens the confirmation with the trimmed justification and sends nothing yet", async () => {
    renderForm();

    await userEvent.type(
      screen.getByLabelText("Justificativa"),
      "  Dentro do orçamento  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rejeitar" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Rejeitar esta solicitação?");
    expect(dialog.querySelector("blockquote")?.textContent).toBe(
      "Dentro do orçamento",
    );
    expect(decide).not.toHaveBeenCalled();
  });

  it("keeps the typed text after cancelling the confirmation", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Justificativa"), "Meu texto");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Justificativa")).toHaveValue("Meu texto");
    expect(decide).not.toHaveBeenCalled();
  });

  it("shows the API error under the field on 422 and keeps the text", async () => {
    decide.mockRejectedValue(
      new ApiError(422, "Dados inválidos", {
        justification: ["A justificativa é inválida."],
      }),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText("Justificativa"), "Texto");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (b) => b.textContent === "Aprovar",
      )!,
    );

    expect(
      await screen.findByText("A justificativa é inválida."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Justificativa")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Justificativa")).toHaveValue("Texto");
    await waitFor(() =>
      expect(screen.getByLabelText("Justificativa")).toHaveFocus(),
    );
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("locks the form after a successful decision, while the screen reloads", async () => {
    decide.mockResolvedValue(makeRequest({ status: "approved" }));
    renderForm();

    await userEvent.type(screen.getByLabelText("Justificativa"), "Texto");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (b) => b.textContent === "Aprovar",
      )!,
    );

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeDisabled();
    expect(screen.getByLabelText("Justificativa")).toHaveAttribute("readonly");
  });

  it("shows only the buttons the API allows", () => {
    renderForm({ reject: false });

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rejeitar" }),
    ).not.toBeInTheDocument();
  });
});
