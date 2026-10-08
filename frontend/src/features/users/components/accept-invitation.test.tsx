import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";

import { AcceptInvitation } from "./accept-invitation";

const replace = vi.fn();
const getInvitation = vi.fn();
const acceptInvitation = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/users/api", () => ({
  getInvitation: (...args: unknown[]) => getInvitation(...args),
  acceptInvitation: (...args: unknown[]) => acceptInvitation(...args),
}));

const CREATE = { name: "Criar conta" };
const GONE = { name: "Convite indisponível" };

const invitation = {
  name: "Maria Souza",
  email: "maria@empresa.com",
  role: "analyst",
  area: { id: 2, name: "Operações" },
  expires_at: "2026-10-14T12:00:00Z",
};

function user(role: Role) {
  return {
    id: 9,
    name: "Maria Souza",
    email: "maria@empresa.com",
    role,
    area: { id: 2, name: "Operações" },
  };
}

async function renderReady() {
  getInvitation.mockResolvedValue(invitation);
  const ui = userEvent.setup();
  render(<AcceptInvitation token="tok123" />);
  await screen.findByRole("heading", { name: "Criar sua conta" });
  return ui;
}

async function fill(
  ui: ReturnType<typeof userEvent.setup>,
  password = "secret-123",
  confirmation = password,
) {
  if (password) await ui.type(screen.getByLabelText("Senha"), password);
  if (confirmation) {
    await ui.type(screen.getByLabelText("Confirmar senha"), confirmation);
  }
}

describe("AcceptInvitation", () => {
  beforeEach(() => {
    replace.mockReset();
    getInvitation.mockReset();
    acceptInvitation.mockReset();
  });

  it("shows a loading state while the invitation loads", () => {
    getInvitation.mockReturnValue(new Promise(() => {}));
    render(<AcceptInvitation token="tok123" />);

    expect(screen.getByLabelText("Carregando convite")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(getInvitation).toHaveBeenCalledWith("tok123");
  });

  it("shows the invitation data as text and asks only for the password", async () => {
    await renderReady();

    expect(screen.getByText("Maria Souza")).toBeVisible();
    expect(screen.getByText("maria@empresa.com")).toBeVisible();
    expect(screen.getByText("Analista")).toBeVisible();
    expect(screen.getByText("Operações")).toBeVisible();

    expect(screen.getByLabelText("Senha")).toBeVisible();
    expect(screen.getByLabelText("Confirmar senha")).toBeVisible();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Perfil")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Área")).not.toBeInTheDocument();
    expect(screen.getByText(/Mínimo de 8 caracteres/)).toBeVisible();
  });

  it("toggles the password visibility", async () => {
    const ui = await renderReady();

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    await ui.click(screen.getAllByRole("button", { name: "Mostrar senha" })[0]);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  });

  it.each([
    ["requester", "/requests"],
    ["analyst", "/dashboard"],
    ["admin", "/dashboard"],
  ] as const)(
    "sends a new %s to %s after creating the account",
    async (role, home) => {
      acceptInvitation.mockResolvedValue(user(role));
      const ui = await renderReady();

      await fill(ui);
      await ui.click(screen.getByRole("button", CREATE));

      expect(acceptInvitation).toHaveBeenCalledWith("tok123", {
        password: "secret-123",
        password_confirmation: "secret-123",
      });
      await waitFor(() => expect(replace).toHaveBeenCalledWith(home));
    },
  );

  it("shows 'Criando conta…' and disables the button while sending", async () => {
    let resolve: (value: unknown) => void = () => {};
    acceptInvitation.mockReturnValue(new Promise((r) => (resolve = r)));
    const ui = await renderReady();

    await fill(ui);
    await ui.click(screen.getByRole("button", CREATE));

    expect(
      screen.getByRole("button", { name: "Criando conta…" }),
    ).toBeDisabled();

    resolve(user("requester"));
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("blocks a password shorter than 8 characters", async () => {
    const ui = await renderReady();

    await fill(ui, "short12");
    await ui.click(screen.getByRole("button", CREATE));

    expect(
      screen.getByText("A senha deve ter pelo menos 8 caracteres."),
    ).toBeVisible();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("blocks a confirmation that differs", async () => {
    const ui = await renderReady();

    await fill(ui, "secret-123", "secret-456");
    await ui.click(screen.getByRole("button", CREATE));

    expect(screen.getByText("As senhas não conferem.")).toBeVisible();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("shows the 422 password message on the password field", async () => {
    acceptInvitation.mockRejectedValue(
      new ApiError(422, "x", { password: ["A senha é fraca."] }),
    );
    const ui = await renderReady();

    await fill(ui);
    await ui.click(screen.getByRole("button", CREATE));

    expect(await screen.findByText("A senha é fraca.")).toBeVisible();
    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.queryByRole("heading", GONE)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("swaps to 'Convite indisponível' when the accept answers 404", async () => {
    acceptInvitation.mockRejectedValue(new ApiError(404, "gone"));
    const ui = await renderReady();

    await fill(ui);
    await ui.click(screen.getByRole("button", CREATE));

    expect(await screen.findByRole("heading", GONE)).toBeVisible();
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([419, 500])(
    "shows the alert on %i and keeps the typed data",
    async (status) => {
      acceptInvitation.mockRejectedValue(new ApiError(status, "x"));
      const ui = await renderReady();

      await fill(ui);
      await ui.click(screen.getByRole("button", CREATE));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível criar a conta. Tente novamente.",
      );
      expect(screen.getByLabelText("Senha")).toHaveValue("secret-123");
      expect(screen.getByLabelText("Confirmar senha")).toHaveValue(
        "secret-123",
      );
      expect(screen.getByRole("button", CREATE)).toBeEnabled();
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it("shows 'Convite indisponível' without the form when the GET answers 404", async () => {
    getInvitation.mockRejectedValue(new ApiError(404, "gone"));
    render(<AcceptInvitation token="expired" />);

    expect(await screen.findByRole("heading", GONE)).toBeVisible();
    expect(
      screen.getByText(
        "Este convite expirou ou já foi usado. Peça um novo convite ao administrador.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ir para o login" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
  });

  it("opens on 'Convite indisponível' without calling the API when there is no token", () => {
    render(<AcceptInvitation token="" />);

    expect(screen.getByRole("heading", GONE)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ir para o login" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    expect(getInvitation).not.toHaveBeenCalled();
  });
});
