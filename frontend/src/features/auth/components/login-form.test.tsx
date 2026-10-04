import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";

import { LoginForm } from "./login-form";

const replace = vi.fn();
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/api", () => ({
  login: (...args: unknown[]) => login(...args),
}));

function user(role: Role) {
  return {
    id: 1,
    name: "N",
    email: "a@b.co",
    role,
    area: { id: 1, name: "TI" },
  };
}

async function fill(
  ui: ReturnType<typeof userEvent.setup>,
  email = "a@b.co",
  password = "secret",
) {
  if (email) await ui.type(screen.getByLabelText("E-mail"), email);
  if (password) await ui.type(screen.getByLabelText("Senha"), password);
}

describe("LoginForm", () => {
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
    login.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows field errors for empty fields without calling the API", async () => {
    const ui = userEvent.setup();
    render(<LoginForm />);

    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid e-mail without calling the API", async () => {
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui, "not-an-email", "secret");
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.queryByText("Informe a senha.")).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it.each([
    ["requester", "/requests"],
    ["analyst", "/dashboard"],
    ["admin", "/dashboard"],
  ] as const)("sends %s to %s after login", async (role, destination) => {
    login.mockResolvedValue(user(role));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(replace).toHaveBeenCalledWith(destination);
  });

  it("sends the credentials and remember false by default", async () => {
    login.mockResolvedValue(user("requester"));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "secret",
      remember: false,
    });
  });

  it("sends remember true when the checkbox is ticked", async () => {
    login.mockResolvedValue(user("requester"));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByLabelText("Mantenha-me conectado"));
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ remember: true }),
    );
  });

  it("shows the credentials error on 422 and does not navigate", async () => {
    login.mockRejectedValue(new ApiError(422, "x", { email: ["x"] }));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("E-mail ou senha incorretos."),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("shows 15 minutes and disables the button on 429 with Retry-After 900", async () => {
    login.mockRejectedValue(new ApiError(429, "Muitas.", {}, 900));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/15 minutos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("shows the API message on 429 without Retry-After", async () => {
    login.mockRejectedValue(new ApiError(429, "Aguarde um pouco."));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/Aguarde um pouco\./)).toBeInTheDocument();
  });

  it("shows a generic error on unexpected failures", async () => {
    login.mockRejectedValue(new ApiError(500, "boom"));
    const ui = userEvent.setup();
    render(<LoginForm />);

    await fill(ui);
    await ui.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("Não foi possível entrar. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("shows the expired-session notice with expired", () => {
    render(<LoginForm expired />);

    expect(
      screen.getByText("Sua sessão expirou. Entre de novo para continuar."),
    ).toBeInTheDocument();
  });

  it("does not show the expired notice by default", () => {
    render(<LoginForm />);

    expect(screen.queryByText(/sessão expirou/)).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const ui = userEvent.setup();
    render(<LoginForm />);
    const field = screen.getByLabelText("Senha");
    expect(field).toHaveAttribute("type", "password");

    await ui.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(field).toHaveAttribute("type", "text");

    await ui.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(field).toHaveAttribute("type", "password");
  });
});
