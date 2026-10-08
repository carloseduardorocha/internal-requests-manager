import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { InvitationForm } from "./invitation-form";

const replace = vi.fn();
const createInvitation = vi.fn();
const listAreas = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/users/api", () => ({
  createInvitation: (...args: unknown[]) => createInvitation(...args),
  listAreas: (...args: unknown[]) => listAreas(...args),
}));

const SEND = { name: "Enviar convite" };
const AREAS = [
  { id: 1, name: "Financeiro" },
  { id: 2, name: "Operações" },
];

async function renderReady() {
  const ui = userEvent.setup();
  render(<InvitationForm />);
  await screen.findByRole("option", { name: "Operações" });
  return ui;
}

async function fillAll(ui: ReturnType<typeof userEvent.setup>) {
  await ui.type(screen.getByLabelText("Nome"), "  Maria Souza ");
  await ui.type(screen.getByLabelText("E-mail"), " maria@empresa.com ");
  await ui.click(screen.getByRole("radio", { name: /Analista/ }));
  await ui.selectOptions(screen.getByLabelText("Área"), "2");
}

describe("InvitationForm", () => {
  beforeEach(() => {
    replace.mockReset();
    createInvitation.mockReset();
    listAreas.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    listAreas.mockResolvedValue(AREAS);
  });

  it("offers the three roles and the areas from the API", async () => {
    await renderReady();

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Solicitante/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Analista/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Administrador/ })).toBeVisible();
    expect(screen.getByRole("option", { name: "Financeiro" })).toBeVisible();
  });

  it("blocks empty fields without calling the API and focuses the first", async () => {
    const ui = await renderReady();

    await ui.click(screen.getByRole("button", SEND));

    expect(screen.getByText("O campo nome é obrigatório.")).toBeVisible();
    expect(screen.getByText("O campo e-mail é obrigatório.")).toBeVisible();
    expect(screen.getByText("O campo perfil é obrigatório.")).toBeVisible();
    expect(screen.getByText("O campo área é obrigatório.")).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("blocks an invalid e-mail without calling the API", async () => {
    const ui = await renderReady();

    await ui.type(screen.getByLabelText("Nome"), "Maria");
    await ui.type(screen.getByLabelText("E-mail"), "maria@");
    await ui.click(screen.getByRole("radio", { name: /Solicitante/ }));
    await ui.selectOptions(screen.getByLabelText("Área"), "1");
    await ui.click(screen.getByRole("button", SEND));

    expect(screen.getByText("Informe um e-mail válido.")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("sends the trimmed payload, then toasts and goes back to /users", async () => {
    createInvitation.mockResolvedValue({ email: "maria@empresa.com" });
    const ui = await renderReady();

    await fillAll(ui);
    await ui.click(screen.getByRole("button", SEND));

    expect(createInvitation).toHaveBeenCalledWith({
      name: "Maria Souza",
      email: "maria@empresa.com",
      role: "analyst",
      area_id: 2,
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/users"));
    expect(toastSuccess).toHaveBeenCalledWith("Convite enviado", {
      description: "maria@empresa.com recebe o link por e-mail.",
    });
  });

  it("shows 'Enviando…' and disables the button while sending", async () => {
    let resolve: (value: unknown) => void = () => {};
    createInvitation.mockReturnValue(new Promise((r) => (resolve = r)));
    const ui = await renderReady();

    await fillAll(ui);
    await ui.click(screen.getByRole("button", SEND));

    const busy = screen.getByRole("button", { name: "Enviando…" });
    expect(busy).toBeDisabled();

    resolve({ email: "maria@empresa.com" });
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("shows each 422 message on its field and focuses the first one", async () => {
    createInvitation.mockRejectedValue(
      new ApiError(422, "x", {
        name: ["Nome inválido."],
        email: ["Este e-mail já tem uma conta."],
        role: ["Perfil inválido."],
        area_id: ["Área inválida."],
      }),
    );
    const ui = await renderReady();

    await fillAll(ui);
    await ui.click(screen.getByRole("button", SEND));

    expect(await screen.findByText("Nome inválido.")).toBeVisible();
    expect(screen.getByText("Este e-mail já tem uma conta.")).toBeVisible();
    expect(screen.getByText("Perfil inválido.")).toBeVisible();
    expect(screen.getByText("Área inválida.")).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", SEND)).toBeEnabled();
  });

  it("focuses the e-mail when only the e-mail has a 422", async () => {
    createInvitation.mockRejectedValue(
      new ApiError(422, "x", { email: ["Este e-mail já tem uma conta."] }),
    );
    const ui = await renderReady();

    await fillAll(ui);
    await ui.click(screen.getByRole("button", SEND));

    expect(
      await screen.findByText("Este e-mail já tem uma conta."),
    ).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
  });

  it("toasts the error and stays on the page on other failures", async () => {
    createInvitation.mockRejectedValue(new ApiError(500, "Erro no servidor."));
    const ui = await renderReady();

    await fillAll(ui);
    await ui.click(screen.getByRole("button", SEND));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome")).toHaveValue("  Maria Souza ");
  });

  it("offers 'Tentar de novo' when the areas fail to load and reloads them", async () => {
    listAreas.mockRejectedValueOnce(new ApiError(500, "x"));
    const ui = userEvent.setup();
    render(<InvitationForm />);

    expect(
      await screen.findByText("Não foi possível carregar as áreas."),
    ).toBeVisible();
    expect(screen.getByRole("button", SEND)).toBeDisabled();

    await ui.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(
      await screen.findByRole("option", { name: "Financeiro" }),
    ).toBeVisible();
    expect(listAreas).toHaveBeenCalledTimes(2);
  });

  it("links Cancelar back to /users", async () => {
    await renderReady();

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/users",
    );
  });
});
