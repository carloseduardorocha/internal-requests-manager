import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assignInternalRequest,
  decideInternalRequest,
  deleteInternalRequest,
  getInternalRequest,
} from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import RequestDetailPage from "./page";

const replace = vi.fn();
let routeId = "10";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/requests/api", () => ({
  getInternalRequest: vi.fn(),
  deleteInternalRequest: vi.fn(),
  assignInternalRequest: vi.fn(),
  decideInternalRequest: vi.fn(),
}));

const assign = vi.mocked(assignInternalRequest);
const get = vi.mocked(getInternalRequest);
const remove = vi.mocked(deleteInternalRequest);

describe("RequestDetailPage", () => {
  beforeEach(() => {
    get.mockReset();
    remove.mockReset();
    assign.mockReset();
    replace.mockReset();
    routeId = "10";
    sessionStorage.clear();
  });

  it("shows the skeleton while loading", () => {
    get.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<RequestDetailPage />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("loads the request from the route id and shows it", async () => {
    get.mockResolvedValue(makeRequest({ id: 10, title: "Notebook novo" }));
    render(<RequestDetailPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Notebook novo" }),
    ).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("10");
    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/requests");
  });

  it("shows 'Solicitação não encontrada' with a link to the list on 404", async () => {
    get.mockImplementation(() =>
      Promise.reject(new ApiError(404, "Não encontrado")),
    );
    render(<RequestDetailPage />);

    expect(
      await screen.findByText("Solicitação não encontrada"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a lista" })).toHaveAttribute(
      "href",
      "/requests",
    );
  });

  it("shows a load error with 'Tentar de novo' on other failures, which loads again", async () => {
    get.mockImplementationOnce(() =>
      Promise.reject(new ApiError(500, "Erro interno")),
    );
    get.mockResolvedValue(makeRequest());
    render(<RequestDetailPage />);

    const retry = await screen.findByRole("button", {
      name: "Tentar de novo",
    });
    expect(
      screen.queryByText("Solicitação não encontrada"),
    ).not.toBeInTheDocument();

    await userEvent.click(retry);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Notebook novo" }),
    ).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("hides the actions when the API says the request cannot be changed", async () => {
    get.mockResolvedValue(
      makeRequest({
        status: "in_review",
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: false,
          reject: false,
        },
      }),
    );
    render(<RequestDetailPage />);

    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.queryByRole("link", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Excluir" }),
    ).not.toBeInTheDocument();
  });

  it("reloads the request when the delete answers 409", async () => {
    get.mockResolvedValueOnce(makeRequest());
    get.mockResolvedValueOnce(
      makeRequest({
        status: "in_review",
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: false,
          reject: false,
        },
      }),
    );
    remove.mockRejectedValue(
      new ApiError(
        409,
        "Este pedido não está mais Aberto e não pode ser alterado.",
      ),
    );
    const ui = userEvent.setup();
    render(<RequestDetailPage />);

    await ui.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");
    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Excluir" }),
      ).not.toBeInTheDocument(),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(["abc", "12x", "-1", "1.5"])(
    "shows 'não encontrada' without calling the API for the id %s",
    async (id) => {
      routeId = id;
      render(<RequestDetailPage />);

      expect(
        await screen.findByText("Solicitação não encontrada"),
      ).toBeInTheDocument();
      expect(get).not.toHaveBeenCalled();
    },
  );

  it("goes back to the list with the filters it had", async () => {
    sessionStorage.setItem("requests:list-query", "status=open&page=2");
    get.mockResolvedValue(makeRequest());
    render(<RequestDetailPage />);

    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.getByRole("link", { name: "Voltar para a lista" }),
    ).toHaveAttribute("href", "/requests?status=open&page=2");
  });

  it("keeps the detail on screen and moves the focus to the title after a 409", async () => {
    get.mockResolvedValueOnce(makeRequest());
    get.mockResolvedValueOnce(
      makeRequest({
        status: "in_review",
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: false,
          reject: false,
        },
      }),
    );
    remove.mockRejectedValue(new ApiError(409, "Não está mais Aberto."));
    const ui = userEvent.setup();
    const { container } = render(<RequestDetailPage />);

    await ui.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");
    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    // No skeleton in between: the title is always there.
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
  });

  it("moves the focus to the 'não encontrada' title when the reload after a 409 answers 404", async () => {
    get.mockResolvedValueOnce(makeRequest());
    get.mockRejectedValueOnce(new ApiError(404, "Não encontrado"));
    remove.mockRejectedValue(new ApiError(409, "Não está mais Aberto."));
    const ui = userEvent.setup();
    render(<RequestDetailPage />);

    await ui.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialog = await screen.findByRole("alertdialog");
    await ui.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(screen.getByText("Solicitação não encontrada")).toHaveFocus(),
    );
  });

  it("after assigning, reloads without a skeleton and focuses the justification field", async () => {
    get.mockResolvedValueOnce(
      makeRequest({
        can: {
          update: false,
          delete: false,
          assign: true,
          approve: false,
          reject: false,
        },
      }),
    );
    get.mockResolvedValueOnce(
      makeRequest({
        status: "in_review",
        assigned_to: { id: 5, name: "Bruno Lima" },
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: true,
          reject: true,
        },
      }),
    );
    assign.mockResolvedValue(makeRequest({ status: "in_review" }));
    const ui = userEvent.setup();
    const { container } = render(<RequestDetailPage />);

    await ui.click(
      await screen.findByRole("button", { name: "Assumir análise" }),
    );

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    await waitFor(() =>
      expect(screen.getByLabelText("Justificativa")).toHaveFocus(),
    );
    expect(
      screen.queryByRole("button", { name: "Assumir análise" }),
    ).not.toBeInTheDocument();
  });

  it("after a 409 on assign, reloads and focuses the title when there is no justification field", async () => {
    get.mockResolvedValueOnce(
      makeRequest({
        can: {
          update: false,
          delete: false,
          assign: true,
          approve: false,
          reject: false,
        },
      }),
    );
    get.mockResolvedValueOnce(
      makeRequest({
        status: "in_review",
        assigned_to: { id: 6, name: "Carla Dias" },
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: false,
          reject: false,
        },
      }),
    );
    assign.mockRejectedValue(new ApiError(409, "Já foi assumido."));
    const ui = userEvent.setup();
    render(<RequestDetailPage />);

    await ui.click(
      await screen.findByRole("button", { name: "Assumir análise" }),
    );

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
    expect(screen.getByText(/Em análise com/)).toBeInTheDocument();
  });

  it("after a decision, reloads and shows the decision, with the focus on the title", async () => {
    get.mockResolvedValueOnce(
      makeRequest({
        status: "in_review",
        assigned_to: { id: 5, name: "Bruno Lima" },
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: true,
          reject: true,
        },
      }),
    );
    get.mockResolvedValueOnce(
      makeRequest({
        status: "approved",
        assigned_to: { id: 5, name: "Bruno Lima" },
        decision: {
          decided_by: { id: 5, name: "Bruno Lima" },
          decided_at: "2026-10-03T15:00:00.000000Z",
          justification: "Dentro do orçamento",
        },
        can: {
          update: false,
          delete: false,
          assign: false,
          approve: false,
          reject: false,
        },
      }),
    );
    vi.mocked(decideInternalRequest).mockResolvedValue(makeRequest());
    const ui = userEvent.setup();
    render(<RequestDetailPage />);

    await ui.type(
      await screen.findByLabelText("Justificativa"),
      "Dentro do orçamento",
    );
    await ui.click(screen.getByRole("button", { name: "Aprovar" }));
    const dialog = await screen.findByRole("alertdialog");
    await ui.click(within(dialog).getByRole("button", { name: "Aprovar" }));

    expect(await screen.findByText("Dentro do orçamento")).toBeInTheDocument();
    expect(screen.getAllByText("Aprovada").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Justificativa")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
  });
});
