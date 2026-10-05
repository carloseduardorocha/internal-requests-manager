import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import EditRequestPage from "./page";

const replace = vi.fn();
let routeId = "10";
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  getInternalRequest: vi.fn(),
  createInternalRequest: vi.fn(),
  updateInternalRequest: vi.fn(),
}));

const get = vi.mocked(getInternalRequest);

describe("EditRequestPage", () => {
  beforeEach(() => {
    get.mockReset();
    replace.mockReset();
    toastError.mockReset();
    routeId = "10";
  });

  it("shows the skeleton while loading", () => {
    get.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<EditRequestPage />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("shows the form filled with the request when the API allows editing", async () => {
    get.mockResolvedValue(
      makeRequest({
        id: 10,
        title: "Notebook novo",
        can: { update: true, delete: true },
      }),
    );
    render(<EditRequestPage />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Editar solicitação #10",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Notebook novo");
    expect(
      screen.getByRole("link", { name: "Voltar para a solicitação" }),
    ).toHaveAttribute("href", "/requests/10");
    expect(replace).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("sends the user to the detail with a toast when can.update is false", async () => {
    get.mockResolvedValue(
      makeRequest({
        status: "in_review",
        can: { update: false, delete: false },
      }),
    );
    render(<EditRequestPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/10"));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível editar",
      expect.objectContaining({
        description:
          "Este pedido não está mais Aberto e não pode ser alterado.",
      }),
    );
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("shows 'Solicitação não encontrada' with a link to the list on 404", async () => {
    get.mockImplementation(() =>
      Promise.reject(new ApiError(404, "Não encontrado")),
    );
    render(<EditRequestPage />);

    expect(
      await screen.findByText("Solicitação não encontrada"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a lista" })).toHaveAttribute(
      "href",
      "/requests",
    );
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();
  });

  it("shows a load error with 'Tentar de novo' on other failures", async () => {
    get.mockImplementationOnce(() =>
      Promise.reject(new ApiError(500, "Erro interno")),
    );
    get.mockResolvedValue(makeRequest());
    render(<EditRequestPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Tentar de novo" }),
    );

    expect(await screen.findByLabelText("Título")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("explains a block on an Open request as a permission problem", async () => {
    get.mockResolvedValue(
      makeRequest({ status: "open", can: { update: false, delete: false } }),
    );
    render(<EditRequestPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/10"));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível editar",
      expect.objectContaining({
        description: "Você não pode editar esta solicitação.",
      }),
    );
  });

  it.each(["abc", "12x"])(
    "shows 'não encontrada' without calling the API for the id %s",
    (id) => {
      routeId = id;
      render(<EditRequestPage />);

      expect(
        screen.getByText("Solicitação não encontrada"),
      ).toBeInTheDocument();
      expect(get).not.toHaveBeenCalled();
    },
  );
});
