import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateUser } from "@/features/users/api";
import { makeArea, makeUser } from "@/features/users/test-fixtures";
import type { ManagedUser } from "@/features/users/types";
import { ApiError } from "@/lib/api";

import { EditUserDialog } from "./edit-user-dialog";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onSaved = vi.fn();
const onOpenChange = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/users/api", () => ({
  updateUser: vi.fn(),
}));

const update = vi.mocked(updateUser);

const areas = [
  makeArea({ id: 1, name: "TI" }),
  makeArea({ id: 2, name: "Financeiro" }),
  makeArea({ id: 3, name: "RH" }),
];

function setup(user: ManagedUser = makeUser()) {
  const ui = userEvent.setup();
  render(
    <EditUserDialog
      user={user}
      areas={areas}
      open
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />,
  );
  return { ui, dialog: screen.getByRole("dialog") };
}

const nameInput = () => screen.getByLabelText("Nome");

async function replaceName(
  ui: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  await ui.clear(nameInput());
  if (value) await ui.type(nameInput(), value);
}

function validation(errors: Record<string, string[]>) {
  return new ApiError(422, "Os dados informados são inválidos.", errors);
}

describe("EditUserDialog", () => {
  beforeEach(() => {
    update.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    onSaved.mockReset();
    onOpenChange.mockReset();
  });

  it("starts with the account's data and shows the e-mail as read-only", () => {
    setup(makeUser({ name: "Carla Dias", role: "analyst", area: areas[1] }));

    expect(nameInput()).toHaveValue("Carla Dias");
    expect(screen.getByLabelText("Perfil")).toHaveValue("analyst");
    expect(screen.getByLabelText("Área")).toHaveValue("2");
    expect(screen.getByText("carla.dias@empresa.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });

  it("sends name, role and area without the e-mail, then reports and closes", async () => {
    const saved = makeUser({ name: "Carla Souza" });
    update.mockResolvedValue(saved);
    const { ui } = setup();

    await replaceName(ui, "Carla Souza");
    await ui.selectOptions(screen.getByLabelText("Perfil"), "admin");
    await ui.selectOptions(screen.getByLabelText("Área"), "3");
    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(7, {
      name: "Carla Souza",
      area_id: 3,
      role: "admin",
    });
    expect(update.mock.calls[0][1]).not.toHaveProperty("email");
    expect(toastSuccess).toHaveBeenCalledWith(
      "Usuário atualizado",
      expect.anything(),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("trims the spaces around the name", async () => {
    update.mockResolvedValue(makeUser());
    const { ui } = setup();

    await replaceName(ui, "   Carla Souza  ");
    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1].name).toBe("Carla Souza");
  });

  it("blocks an empty name without calling the API and focuses the field", async () => {
    const { ui } = setup();

    await replaceName(ui, "   ");
    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the name error when the user types again", async () => {
    const { ui } = setup();

    await replaceName(ui, "");
    await ui.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByText("Informe o nome.");

    await ui.type(nameInput(), "A");

    expect(screen.queryByText("Informe o nome.")).not.toBeInTheDocument();
  });

  describe("own account (can.change_role false)", () => {
    const own = () =>
      makeUser({
        role: "admin",
        can: {
          update: true,
          change_role: false,
          deactivate: false,
          reactivate: false,
        },
      });

    it("shows the role as read-only text, with no select", () => {
      setup(own());

      expect(screen.queryByLabelText("Perfil")).not.toBeInTheDocument();
      expect(screen.getByText("Administrador")).toBeInTheDocument();
      expect(
        screen.getByText("Você não pode alterar o próprio perfil."),
      ).toBeInTheDocument();
    });

    it("sends the payload without role", async () => {
      update.mockResolvedValue(own());
      const { ui } = setup(own());

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update).toHaveBeenCalledWith(7, {
        name: "Carla Dias",
        area_id: 2,
      });
      expect(update.mock.calls[0][1]).not.toHaveProperty("role");
    });

    it("sends the role error to the alert, as there is no field", async () => {
      update.mockRejectedValue(
        validation({ role: ["Você não pode alterar o próprio perfil."] }),
      );
      const { ui } = setup(own());

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Você não pode alterar o próprio perfil.",
      );
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("validation errors (422)", () => {
    it("shows the name error on the name field and focuses it", async () => {
      update.mockRejectedValue(validation({ name: ["O nome é obrigatório."] }));
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      expect(
        await screen.findByText("O nome é obrigatório."),
      ).toBeInTheDocument();
      expect(nameInput()).toHaveAttribute("aria-invalid", "true");
      expect(nameInput()).toHaveFocus();
      expect(screen.getByLabelText("Área")).not.toHaveAttribute("aria-invalid");
      expect(onSaved).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("shows the role error on the role field and focuses it", async () => {
      update.mockRejectedValue(
        validation({ role: ["O perfil informado é inválido."] }),
      );
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      expect(
        await screen.findByText("O perfil informado é inválido."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Perfil")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText("Perfil")).toHaveFocus();
      expect(nameInput()).not.toHaveAttribute("aria-invalid");
    });

    it("shows the area error on the area field and focuses it", async () => {
      update.mockRejectedValue(
        validation({ area_id: ["A área informada não existe."] }),
      );
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      expect(
        await screen.findByText("A área informada não existe."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Área")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText("Área")).toHaveFocus();
    });

    it("focuses the first field in the order name, role, area", async () => {
      update.mockRejectedValue(
        validation({
          area_id: ["Erro de área."],
          role: ["Erro de perfil."],
          name: ["Erro de nome."],
        }),
      );
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByText("Erro de área.")).toBeInTheDocument();
      expect(screen.getByText("Erro de perfil.")).toBeInTheDocument();
      expect(screen.getByText("Erro de nome.")).toBeInTheDocument();
      expect(nameInput()).toHaveFocus();
    });

    it("focuses role before area when both fail", async () => {
      update.mockRejectedValue(
        validation({ area_id: ["Erro de área."], role: ["Erro de perfil."] }),
      );
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      await screen.findByText("Erro de área.");
      expect(screen.getByLabelText("Perfil")).toHaveFocus();
    });

    it("keeps what the user typed after the error", async () => {
      update.mockRejectedValue(validation({ name: ["O nome é obrigatório."] }));
      const { ui } = setup();

      await replaceName(ui, "Outro nome");
      await ui.selectOptions(screen.getByLabelText("Área"), "3");
      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      await screen.findByText("O nome é obrigatório.");
      expect(nameInput()).toHaveValue("Outro nome");
      expect(screen.getByLabelText("Área")).toHaveValue("3");
    });
  });

  describe("other failures", () => {
    it.each([
      [403, "Você não tem permissão para fazer isso."],
      [500, "Erro interno do servidor."],
    ])(
      "on %s shows the message in the alert and keeps the data",
      async (status, message) => {
        update.mockRejectedValue(new ApiError(status, message));
        const { ui } = setup();

        await replaceName(ui, "Outro nome");
        await ui.click(screen.getByRole("button", { name: "Salvar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(message);
        expect(nameInput()).toHaveValue("Outro nome");
        expect(onSaved).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
      },
    );

    it("shows a generic alert when the failure is not an ApiError", async () => {
      update.mockRejectedValue(new TypeError("network"));
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível concluir a ação. Tente novamente.",
      );
    });

    it.each([401, 419])(
      "on %s (expired session) shows no alert: the API client already redirects",
      async (status) => {
        update.mockRejectedValue(new ApiError(status, "Sessão expirada"));
        const { ui } = setup();

        await ui.click(screen.getByRole("button", { name: "Salvar" }));

        await waitFor(() => expect(update).toHaveBeenCalled());
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled(),
        );
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      },
    );

    it("clears the alert on the next attempt", async () => {
      update.mockRejectedValueOnce(
        new ApiError(500, "Erro interno do servidor."),
      );
      update.mockResolvedValueOnce(makeUser());
      const { ui } = setup();

      await ui.click(screen.getByRole("button", { name: "Salvar" }));
      await screen.findByRole("alert");
      await ui.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows 'Salvando…' and disables the fields while saving", async () => {
    let finish: (user: ManagedUser) => void = () => {};
    update.mockImplementation(
      () => new Promise<ManagedUser>((resolve) => (finish = resolve)),
    );
    const { ui, dialog } = setup();

    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    const busy = await within(dialog).findByRole("button", {
      name: "Salvando…",
    });
    expect(busy).toBeDisabled();
    expect(nameInput()).toBeDisabled();
    expect(screen.getByLabelText("Perfil")).toBeDisabled();
    expect(screen.getByLabelText("Área")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    finish(makeUser());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("does not send twice while saving", async () => {
    update.mockImplementation(() => new Promise<ManagedUser>(() => {}));
    const { ui } = setup();

    await ui.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByRole("button", { name: "Salvando…" });
    await ui.keyboard("{Enter}");

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("cancels without calling the API", async () => {
    const { ui } = setup();

    await ui.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(update).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("EditUserDialog (reopening, alert, a11y and focus)", () => {
  beforeEach(() => {
    update.mockReset();
    onSaved.mockReset();
    onOpenChange.mockReset();
  });

  it("goes back to the row's values when reopened after cancelling", async () => {
    const user = makeUser({
      name: "Carla Dias",
      role: "analyst",
      area: areas[1],
    });
    const ui = userEvent.setup();
    const props = { user, areas, onOpenChange, onSaved };
    const { rerender } = render(<EditUserDialog {...props} open />);

    await replaceName(ui, "Outro nome");
    await ui.selectOptions(screen.getByLabelText("Perfil"), "admin");
    await ui.selectOptions(screen.getByLabelText("Área"), "3");
    rerender(<EditUserDialog {...props} open={false} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(<EditUserDialog {...props} open />);

    expect(nameInput()).toHaveValue("Carla Dias");
    expect(screen.getByLabelText("Perfil")).toHaveValue("analyst");
    expect(screen.getByLabelText("Área")).toHaveValue("2");
  });

  it("shows the message of a 422 about another key in the alert", async () => {
    update.mockRejectedValue(
      new ApiError(422, "O e-mail não pode ser alterado.", {
        email: ["O e-mail não pode ser alterado."],
      }),
    );
    const { ui } = setup();

    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O e-mail não pode ser alterado.",
    );
  });

  it("links each invalid field to its error", async () => {
    update.mockRejectedValue(
      validation({
        name: ["O nome é obrigatório."],
        role: ["O perfil é inválido."],
        area_id: ["A área é inválida."],
      }),
    );
    const { ui } = setup();

    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(nameInput()).toHaveAccessibleDescription("O nome é obrigatório."),
    );
    expect(screen.getByLabelText("Perfil")).toHaveAccessibleDescription(
      "O perfil é inválido.",
    );
    expect(screen.getByLabelText("Área")).toHaveAccessibleDescription(
      "A área é inválida.",
    );
  });

  it.each([
    ["403", new ApiError(403, "Sem permissão.")],
    ["500", new ApiError(500, "Erro interno.")],
    ["a 422 without a field error", validation({ email: ["Inválido."] })],
  ])("focuses 'Salvar' when %s only reaches the alert", async (_, error) => {
    update.mockRejectedValue(error);
    const { ui } = setup();

    await ui.click(screen.getByRole("button", { name: "Salvar" }));

    await screen.findByRole("alert");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar" })).toHaveFocus(),
    );
  });
});
