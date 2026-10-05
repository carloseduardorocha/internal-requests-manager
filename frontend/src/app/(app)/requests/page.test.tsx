import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listInternalRequests } from "@/features/requests/api";
import { makeMeta, makeRequest } from "@/features/requests/test-fixtures";
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

vi.mock("@/features/requests/api", () => ({
  listInternalRequests: vi.fn(),
}));

const list = vi.mocked(listInternalRequests);

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
});
