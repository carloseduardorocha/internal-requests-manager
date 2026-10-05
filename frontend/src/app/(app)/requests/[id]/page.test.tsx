import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteInternalRequest,
  getInternalRequest,
} from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import RequestDetailPage from "./page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "10" }),
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/requests/api", () => ({
  getInternalRequest: vi.fn(),
  deleteInternalRequest: vi.fn(),
}));

const get = vi.mocked(getInternalRequest);
const remove = vi.mocked(deleteInternalRequest);

describe("RequestDetailPage", () => {
  beforeEach(() => {
    get.mockReset();
    remove.mockReset();
    replace.mockReset();
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
        can: { update: false, delete: false },
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
        can: { update: false, delete: false },
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
});
