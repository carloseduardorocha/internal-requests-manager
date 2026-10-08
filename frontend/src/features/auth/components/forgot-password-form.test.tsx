import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { ForgotPasswordForm } from "./forgot-password-form";

const forgotPassword = vi.fn();

vi.mock("@/features/auth/api", () => ({
  forgotPassword: (...args: unknown[]) => forgotPassword(...args),
}));

async function submit(ui: ReturnType<typeof userEvent.setup>, email: string) {
  if (email) await ui.type(screen.getByLabelText("E-mail"), email);
  await ui.click(screen.getByRole("button", { name: "Enviar link" }));
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    forgotPassword.mockReset();
  });

  it("shows the confirmation with the typed e-mail on 204", async () => {
    forgotPassword.mockResolvedValue(undefined);
    const ui = userEvent.setup();
    render(<ForgotPasswordForm />);

    await submit(ui, "ana@empresa.com");

    expect(forgotPassword).toHaveBeenCalledWith("ana@empresa.com");
    expect(
      await screen.findByRole("heading", { name: "Confira seu e-mail" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument();
    expect(screen.getByText(/60 minutos/)).toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it.each(["", "not-an-email"])(
    "blocks the invalid e-mail %j without calling the API",
    async (email) => {
      const ui = userEvent.setup();
      render(<ForgotPasswordForm />);

      await submit(ui, email);

      expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
      expect(screen.getByLabelText("E-mail")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(forgotPassword).not.toHaveBeenCalled();
    },
  );

  it("puts the API message on the field on 422", async () => {
    forgotPassword.mockRejectedValue(
      new ApiError(422, "Inválido.", { email: ["O e-mail é inválido."] }),
    );
    const ui = userEvent.setup();
    render(<ForgotPasswordForm />);

    await submit(ui, "ana@empresa.com");

    expect(await screen.findByText("O e-mail é inválido.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@empresa.com");
    expect(screen.queryByText("Confira seu e-mail")).not.toBeInTheDocument();
  });

  it("shows the block in minutes and disables the button on 429", async () => {
    forgotPassword.mockRejectedValue(new ApiError(429, "Muitas.", {}, 600));
    const ui = userEvent.setup();
    render(<ForgotPasswordForm />);

    await submit(ui, "ana@empresa.com");

    expect(await screen.findByText(/Muitos pedidos seguidos/)).toBeVisible();
    expect(screen.getByText(/10 minutos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeDisabled();
  });

  it("uses the singular for one minute", async () => {
    forgotPassword.mockRejectedValue(new ApiError(429, "Muitas.", {}, 30));
    const ui = userEvent.setup();
    render(<ForgotPasswordForm />);

    await submit(ui, "ana@empresa.com");

    expect(await screen.findByText(/1 minuto\./)).toBeInTheDocument();
  });

  it.each([419, 500])(
    "shows the generic alert on %i and keeps the e-mail",
    async (status) => {
      forgotPassword.mockRejectedValue(new ApiError(status, "x"));
      const ui = userEvent.setup();
      render(<ForgotPasswordForm />);

      await submit(ui, "ana@empresa.com");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível enviar o link. Tente novamente.",
      );
      expect(screen.getByLabelText("E-mail")).toHaveValue("ana@empresa.com");
      expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled();
    },
  );

  it("goes back to the form with the e-mail filled on 'peça de novo'", async () => {
    forgotPassword.mockResolvedValue(undefined);
    const ui = userEvent.setup();
    render(<ForgotPasswordForm />);

    await submit(ui, "ana@empresa.com");
    await ui.click(await screen.findByRole("button", { name: "peça de novo" }));

    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@empresa.com");
    expect(screen.queryByText("Confira seu e-mail")).not.toBeInTheDocument();
  });

  it("links back to the login", () => {
    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("link", { name: "Voltar para o login" }),
    ).toHaveAttribute("href", "/login");
  });
});
