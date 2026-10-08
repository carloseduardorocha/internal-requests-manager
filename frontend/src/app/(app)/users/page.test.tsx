import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeMeta } from "@/features/requests/test-fixtures";
import {
  deactivateUser,
  listAreas,
  listUsers,
  reactivateUser,
  updateUser,
} from "@/features/users/api";
import { makeArea, makeUser } from "@/features/users/test-fixtures";
import type { ManagedUser } from "@/features/users/types";
import { ApiError } from "@/lib/api";

import UsersPage from "./page";

const replace = vi.fn();
const push = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/users",
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock("@/features/users/api", () => ({
  listUsers: vi.fn(),
  listAreas: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
}));

const list = vi.mocked(listUsers);
const areasApi = vi.mocked(listAreas);
const update = vi.mocked(updateUser);
const deactivate = vi.mocked(deactivateUser);
const reactivate = vi.mocked(reactivateUser);

const areas = [makeArea({ id: 1, name: "TI" }), makeArea({ id: 2 })];

const me = makeUser({
  id: 1,
  name: "Maria Admin",
  email: "maria@empresa.com",
  role: "admin",
  area: areas[0],
  can: {
    update: true,
    change_role: false,
    deactivate: false,
    reactivate: false,
  },
});
const carla = makeUser({ id: 7, name: "Carla Dias" });
const pedro = makeUser({
  id: 9,
  name: "Pedro Inativo",
  email: "pedro@empresa.com",
  status: "deactivated",
  deactivated_at: "2026-10-04T10:00:00.000000Z",
  can: {
    update: true,
    change_role: true,
    deactivate: false,
    reactivate: true,
  },
});

function respondWith(
  data: ManagedUser[] = [me, carla, pedro],
  meta = makeMeta({ total: data.length, from: 1, to: data.length }),
) {
  list.mockResolvedValue({ data, meta });
}

async function renderLoaded() {
  const ui = userEvent.setup();
  render(<UsersPage />);
  await waitFor(() =>
    expect(screen.queryByText("Carregando usuários…")).toBeNull(),
  );
  return ui;
}

function row(name: string) {
  return screen.getByText(name).closest("div")!.parentElement!.parentElement!;
}

async function pick(
  ui: ReturnType<typeof userEvent.setup>,
  name: string,
  item: string,
) {
  await ui.click(screen.getByRole("button", { name: `Ações de ${name}` }));
  await ui.click(await screen.findByRole("menuitem", { name: item }));
}

describe("UsersPage", () => {
  beforeEach(() => {
    list.mockReset();
    areasApi.mockReset();
    update.mockReset();
    deactivate.mockReset();
    reactivate.mockReset();
    replace.mockReset();
    push.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    query = "";
    areasApi.mockResolvedValue(areas);
  });

  it("titles the page", async () => {
    respondWith();
    await renderLoaded();

    expect(
      screen.getByRole("heading", { level: 1, name: "Usuários" }),
    ).toBeInTheDocument();
  });

  describe("states", () => {
    it("shows the skeleton while loading", () => {
      list.mockImplementation(() => new Promise(() => {}));
      const { container } = render(<UsersPage />);

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it("lists the accounts once loaded", async () => {
      respondWith();
      await renderLoaded();

      expect(screen.getByText("Carla Dias")).toBeInTheDocument();
      expect(screen.getByText("Pedro Inativo")).toBeInTheDocument();
      expect(
        screen.getByText("Mostrando 1–3 de 3 usuários"),
      ).toBeInTheDocument();
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it("marks the own account with 'Você'", async () => {
      respondWith();
      await renderLoaded();

      expect(row("Maria Admin")).toHaveTextContent("Você");
      expect(row("Carla Dias")).not.toHaveTextContent("Você");
    });

    it("shows 'no results' with the search term and clears the filters", async () => {
      query = "search=zzz";
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      const ui = await renderLoaded();

      expect(
        screen.getAllByText("Nenhum usuário encontrado").length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(/Nada corresponde à pesquisa “zzz”/),
      ).toBeInTheDocument();

      const buttons = screen.getAllByRole("button", { name: "Limpar filtros" });
      await ui.click(buttons[buttons.length - 1]);
      expect(replace).toHaveBeenCalledWith("/users");
    });

    it("shows 'no results' for filters without a search term", async () => {
      query = "role=analyst";
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      await renderLoaded();

      expect(
        screen.getByText(/Nada corresponde aos filtros escolhidos/),
      ).toBeInTheDocument();
    });

    it("shows the error with 'Tentar de novo' and loads again on retry", async () => {
      list.mockRejectedValueOnce(new ApiError(500, "Erro"));
      const ui = await renderLoaded();

      expect(
        await screen.findByText("Não foi possível carregar os usuários"),
      ).toBeInTheDocument();

      respondWith();
      await ui.click(screen.getByRole("button", { name: "Tentar de novo" }));

      expect(await screen.findByText("Carla Dias")).toBeInTheDocument();
      expect(list).toHaveBeenCalledTimes(2);
    });

    it("shows the error with retry when the areas fail to load", async () => {
      areasApi.mockRejectedValueOnce(new ApiError(500, "Erro"));
      respondWith();
      const ui = await renderLoaded();

      expect(
        await screen.findByText("Não foi possível carregar os usuários"),
      ).toBeInTheDocument();
      expect(list).not.toHaveBeenCalled();

      await ui.click(screen.getByRole("button", { name: "Tentar de novo" }));

      expect(await screen.findByText("Carla Dias")).toBeInTheDocument();
      expect(areasApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("filters in the URL", () => {
    it("sends the filters from the URL to the API", async () => {
      query = "search=car&role=analyst&area_id=2&status=active&page=1";
      respondWith();
      await renderLoaded();

      expect(list).toHaveBeenCalledWith({
        search: "car",
        role: "analyst",
        area_id: 2,
        status: "active",
        page: 1,
      });
    });

    it("discards an unknown area_id before calling the API", async () => {
      query = "area_id=99";
      respondWith();
      await renderLoaded();

      expect(list).toHaveBeenCalledTimes(1);
      expect(list.mock.calls[0][0].area_id).toBeNull();
    });

    it("falls back to the defaults for invalid values", async () => {
      query = "role=boss&status=zzz&page=-4";
      respondWith();
      await renderLoaded();

      expect(list).toHaveBeenCalledWith({
        search: "",
        role: "",
        area_id: null,
        status: "",
        page: 1,
      });
    });

    it("goes to the last page when the URL is past the end", async () => {
      query = "page=9";
      respondWith([carla], makeMeta({ last_page: 3, current_page: 3 }));
      await renderLoaded();

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith("/users?page=3"),
      );
    });

    it("pages with push, keeping the filters", async () => {
      query = "role=analyst";
      respondWith(
        [carla],
        makeMeta({ total: 30, last_page: 2, from: 1, to: 15 }),
      );
      const ui = await renderLoaded();

      await ui.click(screen.getByRole("button", { name: /Próxima/ }));

      expect(push).toHaveBeenCalledWith("/users?role=analyst&page=2");
    });
  });

  describe("changing an account without reloading the list", () => {
    it("deactivates through the confirmation, swapping the badge and showing the toast", async () => {
      respondWith();
      deactivate.mockResolvedValue({
        ...carla,
        status: "deactivated",
        deactivated_at: "2026-10-07T10:00:00.000000Z",
        can: { ...carla.can, deactivate: false, reactivate: true },
      });
      const ui = await renderLoaded();
      expect(within(row("Carla Dias")).getByText("Ativa")).toBeInTheDocument();

      await pick(ui, "Carla Dias", "Desativar");
      const dialog = await screen.findByRole("alertdialog");
      expect(deactivate).not.toHaveBeenCalled();
      await ui.click(within(dialog).getByRole("button", { name: "Desativar" }));

      await waitFor(() =>
        expect(
          within(row("Carla Dias")).getByText("Desativada"),
        ).toBeInTheDocument(),
      );
      expect(deactivate).toHaveBeenCalledWith(7);
      expect(toastSuccess).toHaveBeenCalledWith(
        "Conta desativada",
        expect.objectContaining({
          description: "Carla Dias não consegue mais entrar.",
        }),
      );
      expect(list).toHaveBeenCalledTimes(1);

      // The menu now follows the new `can`.
      await ui.click(
        screen.getByRole("button", { name: "Ações de Carla Dias" }),
      );
      expect(
        await screen.findByRole("menuitem", { name: "Reativar" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("menuitem", { name: "Desativar" }),
      ).not.toBeInTheDocument();
    });

    it("does not deactivate when the confirmation is cancelled", async () => {
      respondWith();
      const ui = await renderLoaded();

      await pick(ui, "Carla Dias", "Desativar");
      const dialog = await screen.findByRole("alertdialog");
      await ui.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(deactivate).not.toHaveBeenCalled();
      expect(within(row("Carla Dias")).getByText("Ativa")).toBeInTheDocument();
    });

    it("keeps the badge and shows the error toast when deactivating fails", async () => {
      respondWith();
      deactivate.mockRejectedValue(
        new ApiError(403, "Você não tem permissão para fazer isso."),
      );
      const ui = await renderLoaded();

      await pick(ui, "Carla Dias", "Desativar");
      const dialog = await screen.findByRole("alertdialog");
      await ui.click(within(dialog).getByRole("button", { name: "Desativar" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(toastError).toHaveBeenCalledWith(
        "Não foi possível desativar",
        expect.objectContaining({
          description: "Você não tem permissão para fazer isso.",
        }),
      );
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(within(row("Carla Dias")).getByText("Ativa")).toBeInTheDocument();
      expect(list).toHaveBeenCalledTimes(1);
    });

    it("reactivates, swapping the badge to 'Ativa'", async () => {
      respondWith();
      reactivate.mockResolvedValue({
        ...pedro,
        status: "active",
        deactivated_at: null,
        can: { ...pedro.can, deactivate: true, reactivate: false },
      });
      const ui = await renderLoaded();
      expect(
        within(row("Pedro Inativo")).getByText("Desativada"),
      ).toBeInTheDocument();

      await pick(ui, "Pedro Inativo", "Reativar");

      await waitFor(() =>
        expect(
          within(row("Pedro Inativo")).getByText("Ativa"),
        ).toBeInTheDocument(),
      );
      expect(reactivate).toHaveBeenCalledWith(9);
      expect(toastSuccess).toHaveBeenCalledWith(
        "Conta reativada",
        expect.anything(),
      );
      expect(list).toHaveBeenCalledTimes(1);
    });

    it("edits name and area in the row", async () => {
      respondWith();
      update.mockResolvedValue({
        ...carla,
        name: "Carla Souza",
        area: areas[0],
      });
      const ui = await renderLoaded();
      expect(
        within(row("Carla Dias")).getByText("Financeiro"),
      ).toBeInTheDocument();

      await pick(ui, "Carla Dias", "Editar");
      const dialog = await screen.findByRole("dialog");
      const name = within(dialog).getByLabelText("Nome");
      await ui.clear(name);
      await ui.type(name, "Carla Souza");
      await ui.selectOptions(within(dialog).getByLabelText("Área"), "1");
      await ui.click(within(dialog).getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(screen.getByText("Carla Souza")).toBeInTheDocument(),
      );
      expect(screen.queryByText("Carla Dias")).not.toBeInTheDocument();
      expect(update).toHaveBeenCalledWith(7, {
        name: "Carla Souza",
        area_id: 1,
        role: "analyst",
      });
      expect(within(row("Carla Souza")).getByText("TI")).toBeInTheDocument();
      expect(list).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("does not lose the other rows when one is replaced", async () => {
      respondWith();
      reactivate.mockResolvedValue({ ...pedro, status: "active" });
      const ui = await renderLoaded();

      await pick(ui, "Pedro Inativo", "Reativar");

      await waitFor(() => expect(reactivate).toHaveBeenCalled());
      expect(screen.getByText("Maria Admin")).toBeInTheDocument();
      expect(screen.getByText("Carla Dias")).toBeInTheDocument();
    });
  });
});
