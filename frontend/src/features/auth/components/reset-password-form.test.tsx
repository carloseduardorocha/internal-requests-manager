import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { ResetPasswordForm } from "./reset-password-form";

const replace = vi.fn();
const resetPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/api", () => ({
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

const SAVE = { name: "Salvar nova senha" };
const LOGOUT_OTHERS = "Desconectar dos outros dispositivos";

async function fill(
  ui: ReturnType<typeof userEvent.setup>,
  password = "new-secret-1",
  confirmation = password,
) {
  if (password) await ui.type(screen.getByLabelText("Nova senha"), password);
  if (confirmation) {
    await ui.type(screen.getByLabelText("Confirmar nova senha"), confirmation);
  }
}

function renderForm() {
  return render(<ResetPasswordForm token="tok123" email="ana@empresa.com" />);
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    // jsdom does not implement ResizeObserver, which the Radix checkbox uses.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    replace.mockReset();
    resetPassword.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the account e-mail as text", () => {
    renderForm();

    expect(screen.getByText("ana@empresa.com")).toBeInTheDocument();
    expect(screen.getByText(/Mínimo de 8 caracteres/)).toBeInTheDocument();
  });

  it("replaces to /login?reset=1 on 204", async () => {
    resetPassword.mockResolvedValue(undefined);
    const ui = userEvent.setup();
    renderForm();

    await fill(ui);
    await ui.click(screen.getByRole("button", SAVE));

    expect(replace).toHaveBeenCalledWith("/login?reset=1");
  });

  it("starts with the logout checkbox unticked and sends logout_other_devices false", async () => {
    resetPassword.mockResolvedValue(undefined);
    const ui = userEvent.setup();
    renderForm();

    expect(screen.getByLabelText(LOGOUT_OTHERS)).not.toBeChecked();

    await fill(ui);
    await ui.click(screen.getByRole("button", SAVE));

    expect(resetPassword).toHaveBeenCalledWith({
      token: "tok123",
      email: "ana@empresa.com",
      password: "new-secret-1",
      password_confirmation: "new-secret-1",
      logout_other_devices: false,
    });
  });

  it("sends logout_other_devices true when the checkbox is ticked", async () => {
    resetPassword.mockResolvedValue(undefined);
    const ui = userEvent.setup();
    renderForm();

    await fill(ui);
    await ui.click(screen.getByLabelText(LOGOUT_OTHERS));
    await ui.click(screen.getByRole("button", SAVE));

    expect(resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ logout_other_devices: true }),
    );
  });

  it("blocks a password shorter than 8 characters", async () => {
    const ui = userEvent.setup();
    renderForm();

    await fill(ui, "short12");
    await ui.click(screen.getByRole("button", SAVE));

    expect(
      screen.getByText("A senha deve ter pelo menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("blocks a confirmation that differs", async () => {
    const ui = userEvent.setup();
    renderForm();

    await fill(ui, "new-secret-1", "new-secret-2");
    await ui.click(screen.getByRole("button", SAVE));

    expect(screen.getByText("As senhas não conferem.")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("shows 'Link indisponível' without the form on 422 with errors.token", async () => {
    resetPassword.mockRejectedValue(
      new ApiError(422, "Token inválido.", { token: ["Token inválido."] }),
    );
    const ui = userEvent.setup();
    renderForm();

    await fill(ui);
    await ui.click(screen.getByRole("button", SAVE));

    expect(
      await screen.findByRole("heading", { name: "Link indisponível" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir novo link" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows 'Link indisponível' on 422 with errors.email", async () => {
    resetPassword.mockRejectedValue(
      new ApiError(422, "E-mail inválido.", { email: ["E-mail inválido."] }),
    );
    const ui = userEvent.setup();
    renderForm();

    await fill(ui);
    await ui.click(screen.getByRole("button", SAVE));

    expect(
      await screen.findByRole("heading", { name: "Link indisponível" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir novo link" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the API message on the password field on 422 with errors.password", async () => {
    resetPassword.mockRejectedValue(
      new ApiError(422, "x", { password: ["A senha é fraca."] }),
    );
    const ui = userEvent.setup();
    renderForm();

    await fill(ui);
    await ui.click(screen.getByRole("button", SAVE));

    expect(await screen.findByText("A senha é fraca.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.queryByRole("heading", { name: "Link indisponível" }),
    ).not.toBeInTheDocument();
  });

  it.each([419, 500])(
    "shows the alert on %i and keeps the typed data",
    async (status) => {
      resetPassword.mockRejectedValue(new ApiError(status, "x"));
      const ui = userEvent.setup();
      renderForm();

      await fill(ui);
      await ui.click(screen.getByRole("button", SAVE));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível salvar a nova senha. Tente novamente.",
      );
      expect(screen.getByLabelText("Nova senha")).toHaveValue("new-secret-1");
      expect(screen.getByLabelText("Confirmar nova senha")).toHaveValue(
        "new-secret-1",
      );
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["without token", "", "ana@empresa.com"],
    ["without e-mail", "tok123", ""],
  ])("opens on 'Link indisponível' %s", (_label, token, email) => {
    render(<ResetPasswordForm token={token} email={email} />);

    expect(
      screen.getByRole("heading", { name: "Link indisponível" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pedir novo link" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.getByRole("link", { name: "Voltar para o login" }),
    ).toHaveAttribute("href", "/login");
  });
});
