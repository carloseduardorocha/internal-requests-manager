import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bulkAssignInternalRequests,
  bulkDeleteInternalRequests,
  listInternalRequests,
} from "@/features/requests/api";
import { makeMeta, makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";

import RequestsPage from "./page";

const replace = vi.fn();
const push = vi.fn();
let role: Role = "requester";
let query = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/requests",
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { role } }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  listInternalRequests: vi.fn(),
  bulkAssignInternalRequests: vi.fn(),
  bulkDeleteInternalRequests: vi.fn(),
  deleteInternalRequest: vi.fn(),
}));

const list = vi.mocked(listInternalRequests);
const bulkAssign = vi.mocked(bulkAssignInternalRequests);
const bulkDelete = vi.mocked(bulkDeleteInternalRequests);

const defaultFilters = {
  search: "",
  status: "",
  priority: "",
  sort: "-created_at",
  page: 1,
};

function respondWith(
  data = [makeRequest()],
  meta = makeMeta({ total: data.length }),
) {
  list.mockResolvedValue({ data, meta });
}

async function renderLoaded() {
  render(<RequestsPage />);
  await waitFor(() =>
    expect(screen.queryByText("Carregando solicitações…")).toBeNull(),
  );
}

describe("RequestsPage", () => {
  beforeEach(() => {
    list.mockReset();
    bulkAssign.mockReset();
    bulkDelete.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    replace.mockReset();
    push.mockReset();
    role = "requester";
    query = "";
  });

  describe("header", () => {
    it("titles the page for the requester as their own list", async () => {
      respondWith();
      await renderLoaded();

      expect(
        screen.getByRole("heading", { level: 1, name: "Minhas solicitações" }),
      ).toBeInTheDocument();
    });

    it.each(["analyst", "admin"] as const)(
      "titles the page for %s as the company list",
      async (value) => {
        role = value;
        respondWith();
        await renderLoaded();

        expect(
          screen.getByRole("heading", { level: 1, name: "Solicitações" }),
        ).toBeInTheDocument();
      },
    );

    it.each(["requester", "admin"] as const)(
      "shows 'Nova solicitação' to the %s",
      async (value) => {
        role = value;
        respondWith();
        await renderLoaded();

        expect(
          screen.getByRole("link", { name: "Nova solicitação" }),
        ).toHaveAttribute("href", "/requests/new");
      },
    );

    it("does not show 'Nova solicitação' to the analyst", async () => {
      role = "analyst";
      respondWith();
      await renderLoaded();

      expect(
        screen.queryByRole("link", { name: "Nova solicitação" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("states", () => {
    it("shows the skeleton while loading", () => {
      list.mockImplementation(() => new Promise(() => {}));
      const { container } = render(<RequestsPage />);

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it("shows the requests once loaded", async () => {
      respondWith([
        makeRequest({ id: 1, title: "Primeira" }),
        makeRequest({ id: 2, title: "Segunda" }),
      ]);
      await renderLoaded();

      expect(screen.getByText("Primeira")).toBeInTheDocument();
      expect(screen.getByText("Segunda")).toBeInTheDocument();
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it("tells the requester with no requests and no filters they have opened none", async () => {
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      await renderLoaded();

      expect(
        screen.getByText("Você ainda não abriu nenhuma solicitação"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Nenhuma solicitação encontrada"),
      ).not.toBeInTheDocument();
    });

    it("keeps the create button on the admin's empty list", async () => {
      role = "admin";
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      await renderLoaded();

      expect(
        screen.getByText("Nenhuma solicitação por aqui"),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: "Nova solicitação" }).length,
      ).toBeGreaterThan(0);
    });

    it("shows the empty text without a create button for the analyst", async () => {
      role = "analyst";
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      await renderLoaded();

      expect(
        screen.getByText("Nenhuma solicitação por aqui"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Nova solicitação" }),
      ).not.toBeInTheDocument();
    });

    it("shows 'no results' with active filters and clears them", async () => {
      query = "search=zzz&status=open";
      respondWith([], makeMeta({ total: 0, from: null, to: null }));
      await renderLoaded();

      expect(
        screen.getAllByText("Nenhuma solicitação encontrada").length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByText("Você ainda não abriu nenhuma solicitação"),
      ).not.toBeInTheDocument();

      const [clear] = screen.getAllByRole("button", {
        name: "Limpar filtros",
      });
      await userEvent.click(clear);
      expect(replace).toHaveBeenCalledWith("/requests");
    });

    it("shows the error with 'Tentar de novo', which loads again", async () => {
      list.mockImplementationOnce(() => Promise.reject(new Error("boom")));
      respondWith();
      render(<RequestsPage />);

      const retry = await screen.findByRole("button", {
        name: "Tentar de novo",
      });
      expect(list).toHaveBeenCalledTimes(1);

      await userEvent.click(retry);

      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Notebook novo")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tentar de novo" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("filters from the URL", () => {
    it("loads with the defaults when the URL has no query", async () => {
      respondWith();
      await renderLoaded();

      expect(list).toHaveBeenCalledWith(defaultFilters);
    });

    it("sends all the active filters together in one call", async () => {
      query =
        "search=notebook&status=open&priority=high&sort=created_at&page=2";
      respondWith(
        [makeRequest()],
        makeMeta({ current_page: 2, last_page: 3, total: 40 }),
      );
      await renderLoaded();

      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({
        search: "notebook",
        status: "open",
        priority: "high",
        sort: "created_at",
        page: 2,
      });
    });

    it("never sends invalid values from a hand-edited URL", async () => {
      query = "status=foo&priority=urgent&sort=title&page=0";
      respondWith();
      await renderLoaded();

      expect(list).toHaveBeenCalledWith(defaultFilters);
    });

    it("reflects the URL in the filter controls", async () => {
      query = "search=monitor&status=approved&priority=low";
      respondWith();
      await renderLoaded();

      expect(screen.getByLabelText("Pesquisar")).toHaveValue("monitor");
      expect(screen.getByLabelText("Status")).toHaveValue("approved");
      expect(screen.getByLabelText("Prioridade")).toHaveValue("low");
    });
  });

  describe("pagination", () => {
    it("shows no pagination for a single page", async () => {
      respondWith();
      await renderLoaded();

      expect(
        screen.queryByRole("navigation", { name: "Paginação" }),
      ).not.toBeInTheDocument();
    });

    it("pages with push (so back works) and keeps the filters", async () => {
      query = "status=open";
      respondWith(
        [makeRequest()],
        makeMeta({ current_page: 1, last_page: 3, total: 40, to: 15 }),
      );
      await renderLoaded();
      expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Próxima página" }),
      );

      expect(push).toHaveBeenCalledWith("/requests?status=open&page=2");
      expect(replace).not.toHaveBeenCalled();
    });

    it("goes back to page 1 without a page param in the URL", async () => {
      query = "page=2";
      respondWith(
        [makeRequest()],
        makeMeta({ current_page: 2, last_page: 3, total: 40 }),
      );
      await renderLoaded();

      await userEvent.click(
        screen.getByRole("button", { name: "Página anterior" }),
      );

      expect(push).toHaveBeenCalledWith("/requests");
    });

    it("redirects a page past the last one to the last page", async () => {
      query = "page=9&status=open";
      respondWith([], makeMeta({ current_page: 9, last_page: 3, total: 40 }));
      render(<RequestsPage />);

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith("/requests?status=open&page=3"),
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("does not redirect a valid page", async () => {
      query = "page=3";
      respondWith(
        [makeRequest()],
        makeMeta({ current_page: 3, last_page: 3, total: 40 }),
      );
      await renderLoaded();

      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe("remembered query", () => {
    afterEach(() => sessionStorage.clear());

    it("saves the sanitized query so the back links can restore it", async () => {
      query = "status=open&page=2&status2=x&sort=bogus";
      respondWith();
      await renderLoaded();

      expect(sessionStorage.getItem("requests:list-query")).toBe(
        "status=open&page=2",
      );
    });
  });

  describe("bulk actions", () => {
    const two = [
      makeRequest({ id: 1, title: "Primeira" }),
      makeRequest({ id: 2, title: "Segunda" }),
    ];

    const row = (id: number, title: string) =>
      screen.getByRole("checkbox", { name: `Selecionar #${id} ${title}` });
    const bar = () => screen.queryByRole("region", { name: "Ações em massa" });
    const heading = () => screen.getByRole("heading", { level: 1 });

    async function selectBoth() {
      const ui = userEvent.setup();
      await ui.click(row(1, "Primeira"));
      await ui.click(row(2, "Segunda"));
      return ui;
    }

    async function assignBoth(result: {
      done: number[];
      skipped: { id: number; reason: string; message: string }[];
    }) {
      role = "analyst";
      respondWith(two);
      bulkAssign.mockResolvedValue(result);
      const view = render(<RequestsPage />);
      await screen.findByText("Primeira");
      const ui = await selectBoth();
      await ui.click(screen.getByRole("button", { name: "Assumir" }));
      return { ui, view };
    }

    const skippedSecond = {
      done: [1],
      skipped: [{ id: 2, reason: "not_open", message: "Já foi assumido." }],
    };

    it("shows no bar until something is selected", async () => {
      respondWith(two);
      await renderLoaded();

      expect(bar()).toBeNull();

      await userEvent.click(row(1, "Primeira"));
      expect(bar()).not.toBeNull();
      expect(screen.getByText("1 selecionada")).toBeInTheDocument();
    });

    it("the select-all checkbox marks only the rows of the page", async () => {
      respondWith(two, makeMeta({ total: 40, last_page: 3, to: 2 }));
      await renderLoaded();

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Selecionar todas desta página" }),
      );

      expect(row(1, "Primeira")).toBeChecked();
      expect(row(2, "Segunda")).toBeChecked();
      expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
    });

    it("sends only the page's ids, in list order, whatever the click order", async () => {
      role = "analyst";
      respondWith(two, makeMeta({ total: 40, last_page: 3, to: 2 }));
      bulkAssign.mockResolvedValue({ done: [1, 2], skipped: [] });
      await renderLoaded();
      const ui = userEvent.setup();

      await ui.click(row(2, "Segunda"));
      await ui.click(row(1, "Primeira"));
      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() => expect(bulkAssign).toHaveBeenCalledTimes(1));
      expect(bulkAssign).toHaveBeenCalledWith([1, 2]);
    });

    it("clears the selection with 'Limpar seleção'", async () => {
      respondWith(two);
      await renderLoaded();
      await selectBoth();

      await userEvent.click(
        screen.getByRole("button", { name: "Limpar seleção" }),
      );

      expect(bar()).toBeNull();
      expect(row(1, "Primeira")).not.toBeChecked();
    });

    it("assigning everything shows the toast, reloads the list, clears the bar and focuses the title", async () => {
      await assignBoth({ done: [1, 2], skipped: [] });

      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith("2 solicitações assumidas"),
      );
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(bar()).toBeNull());
      expect(screen.queryByRole("status")).toBeNull();
      expect(heading()).toHaveFocus();
      await screen.findByText("Primeira");
      expect(row(1, "Primeira")).not.toBeChecked();
    });

    it("uses the singular in the toast for one", async () => {
      role = "analyst";
      respondWith(two);
      bulkAssign.mockResolvedValue({ done: [1], skipped: [] });
      await renderLoaded();
      const ui = userEvent.setup();
      await ui.click(row(1, "Primeira"));

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith("1 solicitação assumida"),
      );
    });

    it("with a skipped one, shows the summary with '#id título' and the message, and closing removes it", async () => {
      const { ui } = await assignBoth({
        done: [1],
        skipped: [
          {
            id: 2,
            reason: "not_open",
            message: "Este pedido não está mais Aberto.",
          },
        ],
      });

      const summary = await screen.findByRole("status");
      expect(summary).toHaveTextContent("1 de 2 solicitações assumidas");
      expect(summary).toHaveTextContent("1 ficou de fora:");
      expect(summary).toHaveTextContent("#2 Segunda");
      expect(summary).toHaveTextContent("Este pedido não está mais Aberto.");
      expect(toastSuccess).not.toHaveBeenCalled();
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      expect(bar()).toBeNull();
      expect(summary).toHaveFocus();

      await ui.click(screen.getByRole("button", { name: "Fechar resumo" }));

      expect(screen.queryByRole("status")).toBeNull();
    });

    it("keeps the title in the summary even when the reloaded list no longer has the item", async () => {
      role = "analyst";
      respondWith(two);
      bulkAssign.mockResolvedValue({
        done: [1],
        skipped: [{ id: 2, reason: "not_found", message: "Não encontrado." }],
      });
      await renderLoaded();
      const ui = await selectBoth();
      list.mockResolvedValue({
        data: [],
        meta: makeMeta({ total: 0, from: null, to: null }),
      });

      await ui.click(screen.getByRole("button", { name: "Assumir" }));

      const summary = await screen.findByRole("status");
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      expect(summary).toHaveTextContent("#2 Segunda");
    });

    it("the summary goes away when the page changes", async () => {
      const { view } = await assignBoth(skippedSecond);
      await screen.findByRole("status");
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

      query = "page=2";
      respondWith(two, makeMeta({ current_page: 2, last_page: 3, total: 40 }));
      view.rerender(<RequestsPage />);

      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    });

    it("the summary goes away when the filter changes", async () => {
      const { view } = await assignBoth(skippedSecond);
      await screen.findByRole("status");
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

      query = "status=open";
      view.rerender(<RequestsPage />);

      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    });

    it("the selection goes away when the page changes", async () => {
      respondWith(two, makeMeta({ total: 40, last_page: 3, to: 2 }));
      const view = render(<RequestsPage />);
      await screen.findByText("Primeira");
      await selectBoth();
      expect(bar()).not.toBeNull();

      query = "page=2";
      view.rerender(<RequestsPage />);

      await waitFor(() => expect(bar()).toBeNull());
    });

    describe("delete", () => {
      async function openConfirmation() {
        role = "requester";
        respondWith(two);
        await renderLoaded();
        const ui = await selectBoth();
        await ui.click(screen.getByRole("button", { name: "Excluir" }));
        const dialog = await screen.findByRole("alertdialog");
        return { ui, dialog };
      }

      it("only calls the API after confirming", async () => {
        bulkDelete.mockResolvedValue({ done: [1, 2], skipped: [] });
        const { ui, dialog } = await openConfirmation();

        expect(
          within(dialog).getByText("Excluir 2 solicitações?"),
        ).toBeInTheDocument();
        expect(bulkDelete).not.toHaveBeenCalled();

        await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

        await waitFor(() => expect(bulkDelete).toHaveBeenCalledWith([1, 2]));
        await waitFor(() =>
          expect(toastSuccess).toHaveBeenCalledWith("2 solicitações excluídas"),
        );
        await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
        expect(bulkAssign).not.toHaveBeenCalled();
      });

      it("Cancelar does not call the API and keeps the selection", async () => {
        const { ui, dialog } = await openConfirmation();

        await ui.click(
          within(dialog).getByRole("button", { name: "Cancelar" }),
        );

        await waitFor(() =>
          expect(screen.queryByRole("alertdialog")).toBeNull(),
        );
        expect(bulkDelete).not.toHaveBeenCalled();
        expect(bar()).not.toBeNull();
        expect(list).toHaveBeenCalledTimes(1);
      });

      it("with a skipped one, summarizes 'excluídas'", async () => {
        bulkDelete.mockResolvedValue({
          done: [1],
          skipped: [
            { id: 2, reason: "not_open", message: "Já não está Aberto." },
          ],
        });
        const { ui, dialog } = await openConfirmation();

        await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

        const summary = await screen.findByRole("status");
        expect(summary).toHaveTextContent("1 de 2 solicitações excluídas");
        expect(summary).toHaveTextContent("#2 Segunda");
        expect(summary).toHaveTextContent("Já não está Aberto.");
      });
    });

    describe("errors", () => {
      it("403 clears the selection, reloads the list and shows the toast", async () => {
        role = "analyst";
        respondWith(two);
        bulkAssign.mockRejectedValue(new ApiError(403, "Sem permissão."));
        await renderLoaded();
        const ui = await selectBoth();

        await ui.click(screen.getByRole("button", { name: "Assumir" }));

        await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
        expect(toastError).toHaveBeenCalledWith(
          "Não foi possível assumir",
          expect.objectContaining({ description: "Sem permissão." }),
        );
        await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(bar()).toBeNull());
        expect(toastSuccess).not.toHaveBeenCalled();
        await screen.findByText("Primeira");
        expect(row(1, "Primeira")).not.toBeChecked();
      });

      it("a network error keeps the selection, shows the toast and frees the bar", async () => {
        role = "analyst";
        respondWith(two);
        bulkAssign.mockRejectedValue(new TypeError("network"));
        await renderLoaded();
        const ui = await selectBoth();

        await ui.click(screen.getByRole("button", { name: "Assumir" }));

        await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
        expect(bar()).not.toBeNull();
        expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
        expect(row(1, "Primeira")).toBeChecked();
        expect(list).toHaveBeenCalledTimes(1);
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Assumir" })).toBeEnabled(),
        );
        expect(
          screen.getByRole("button", { name: "Limpar seleção" }),
        ).toBeEnabled();
      });

      it("401 shows no toast and keeps the selection", async () => {
        role = "analyst";
        respondWith(two);
        bulkAssign.mockRejectedValue(new ApiError(401, "Não autenticado"));
        await renderLoaded();
        const ui = await selectBoth();

        await ui.click(screen.getByRole("button", { name: "Assumir" }));

        await waitFor(() => expect(bulkAssign).toHaveBeenCalled());
        await waitFor(() =>
          expect(screen.getByRole("button", { name: "Assumir" })).toBeEnabled(),
        );
        expect(toastError).not.toHaveBeenCalled();
        expect(bar()).not.toBeNull();
      });
    });

    describe("bar by role", () => {
      it.each([
        ["requester", ["Excluir"], ["Assumir"]],
        ["analyst", ["Assumir"], ["Excluir"]],
        ["admin", ["Assumir", "Excluir"], []],
      ] as const)("%s sees the right buttons", async (value, shown, hidden) => {
        role = value;
        respondWith(two);
        await renderLoaded();

        await userEvent.click(row(1, "Primeira"));

        const region = screen.getByRole("region", { name: "Ações em massa" });
        for (const name of shown)
          expect(within(region).getByRole("button", { name })).toBeVisible();
        for (const name of hidden)
          expect(within(region).queryByRole("button", { name })).toBeNull();
      });
    });
  });
});
