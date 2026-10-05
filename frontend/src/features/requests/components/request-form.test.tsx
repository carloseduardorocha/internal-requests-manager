import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInternalRequest,
  updateInternalRequest,
} from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import { RequestForm } from "./request-form";

const replace = vi.fn();
const push = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  createInternalRequest: vi.fn(),
  updateInternalRequest: vi.fn(),
}));

const create = vi.mocked(createInternalRequest);
const update = vi.mocked(updateInternalRequest);

const NOT_OPEN = "Este pedido não está mais Aberto e não pode ser alterado.";

async function fillValid(ui: ReturnType<typeof userEvent.setup>) {
  await ui.type(screen.getByLabelText("Título"), "Notebook para a analista");
  await ui.type(screen.getByLabelText("Descrição"), "Preciso de um novo");
  await ui.click(screen.getByRole("radio", { name: "Alta" }));
}

function submitButton(name = "Criar solicitação") {
  return screen.getByRole("button", { name });
}

describe("RequestForm validation", () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    replace.mockReset();
    push.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("shows the three errors for empty fields without calling the API", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);

    await ui.click(submitButton());

    expect(
      screen.getByText("O campo título é obrigatório."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("O campo descrição é obrigatório."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("O campo prioridade é obrigatório."),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("links each error to its field", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);

    await ui.click(submitButton());

    const title = screen.getByLabelText("Título");
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "title-error");
    const description = screen.getByLabelText("Descrição");
    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAttribute(
      "aria-describedby",
      "description-error",
    );
    // The radios carry no aria-invalid: the error hangs on the fieldset.
    expect(screen.getByRole("group", { name: "Prioridade" })).toHaveAttribute(
      "aria-describedby",
      "priority-error",
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toHaveAttribute("aria-invalid");
    }
  });

  it("treats blanks as empty", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);

    await ui.type(screen.getByLabelText("Título"), "   ");
    await ui.type(screen.getByLabelText("Descrição"), "   ");
    await ui.click(screen.getByRole("radio", { name: "Baixa" }));
    await ui.click(submitButton());

    expect(
      screen.getByText("O campo título é obrigatório."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("O campo descrição é obrigatório."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("O campo prioridade é obrigatório."),
    ).not.toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("has no maxLength on the title and flags 256 characters: red counter and error on submit", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);
    const title = screen.getByLabelText("Título");

    expect(title).not.toHaveAttribute("maxlength");
    fireEvent.change(title, { target: { value: "a".repeat(256) } });
    fireEvent.change(screen.getByLabelText("Descrição"), {
      target: { value: "ok" },
    });
    await ui.click(screen.getByRole("radio", { name: "Alta" }));

    const counter = screen.getByText("256/255");
    expect(counter).toHaveClass("text-destructive");
    // The error only comes on submit.
    expect(screen.queryByText(/no máximo 255/)).not.toBeInTheDocument();

    await ui.click(submitButton());

    expect(
      screen.getByText("O título deve ter no máximo 255 caracteres."),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a title of exactly 255 characters", async () => {
    create.mockResolvedValue(makeRequest({ id: 3 }));
    const ui = userEvent.setup();
    render(<RequestForm />);

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "a".repeat(255) },
    });
    fireEvent.change(screen.getByLabelText("Descrição"), {
      target: { value: "ok" },
    });
    await ui.click(screen.getByRole("radio", { name: "Alta" }));

    expect(screen.getByText("255/255")).not.toHaveClass("text-destructive");
    await ui.click(submitButton());

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  });

  it("flags a description above 10.000 characters", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "ok" },
    });
    fireEvent.change(screen.getByLabelText("Descrição"), {
      target: { value: "a".repeat(10001) },
    });
    await ui.click(screen.getByRole("radio", { name: "Alta" }));
    await ui.click(submitButton());

    expect(
      screen.getByText("A descrição deve ter no máximo 10.000 caracteres."),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("clears a field's error when the user changes it", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);
    await ui.click(submitButton());

    await ui.type(screen.getByLabelText("Título"), "a");
    expect(
      screen.queryByText("O campo título é obrigatório."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Título")).not.toHaveAttribute("aria-invalid");

    await ui.click(screen.getByRole("radio", { name: "Média" }));
    expect(
      screen.queryByText("O campo prioridade é obrigatório."),
    ).not.toBeInTheDocument();
    // The other error stays.
    expect(
      screen.getByText("O campo descrição é obrigatório."),
    ).toBeInTheDocument();
  });

  it("counts the title characters", async () => {
    const ui = userEvent.setup();
    render(<RequestForm />);

    expect(screen.getByText("0/255")).toBeInTheDocument();
    await ui.type(screen.getByLabelText("Título"), "abc");
    expect(screen.getByText("3/255")).toBeInTheDocument();
  });

  it("shows the API 422 errors under each field with aria-invalid", async () => {
    create.mockRejectedValue(
      new ApiError(422, "x", {
        title: ["O título já existe."],
        description: ["Descrição inválida."],
        priority: ["Prioridade inválida."],
      }),
    );
    const ui = userEvent.setup();
    render(<RequestForm />);
    await fillValid(ui);

    await ui.click(submitButton());

    expect(await screen.findByText("O título já existe.")).toBeInTheDocument();
    expect(screen.getByText("Descrição inválida.")).toBeInTheDocument();
    expect(screen.getByText("Prioridade inválida.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Título")).toHaveAttribute(
      "aria-describedby",
      "title-error",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    // The user can try again.
    expect(submitButton()).toBeEnabled();
  });
});

describe("RequestForm create", () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    replace.mockReset();
    push.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("starts empty with the create labels and cancels back to the list", () => {
    render(<RequestForm />);

    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/requests",
    );
  });

  it("offers the three priorities", () => {
    render(<RequestForm />);

    expect(
      screen
        .getAllByRole("radio")
        .map((r) => r.getAttribute("value"))
        .sort(),
    ).toEqual(["high", "low", "medium"]);
  });

  it("sends the trimmed payload, shows a toast and goes to the new detail with replace", async () => {
    create.mockResolvedValue(makeRequest({ id: 11 }));
    const ui = userEvent.setup();
    render(<RequestForm />);
    await ui.type(screen.getByLabelText("Título"), "  Notebook  ");
    await ui.type(screen.getByLabelText("Descrição"), "  Preciso de um  ");
    await ui.click(screen.getByRole("radio", { name: "Média" }));

    await ui.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/11"));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      title: "Notebook",
      description: "Preciso de um",
      priority: "medium",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Solicitação criada");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows 'Salvando…', disables the button and ignores a second submit", async () => {
    let resolve: (value: ReturnType<typeof makeRequest>) => void = () => {};
    create.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const ui = userEvent.setup();
    render(<RequestForm />);
    await fillValid(ui);

    await ui.click(submitButton());

    const busy = screen.getByRole("button", { name: "Salvando…" });
    expect(busy).toBeDisabled();
    fireEvent.submit(busy.closest("form")!);
    expect(create).toHaveBeenCalledTimes(1);

    resolve(makeRequest({ id: 5 }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/5"));
  });

  it("shows an error toast and stays on the form for an unexpected failure", async () => {
    create.mockRejectedValue(new ApiError(500, "Erro interno"));
    const ui = userEvent.setup();
    render(<RequestForm />);
    await fillValid(ui);

    await ui.click(submitButton());

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível salvar",
      expect.objectContaining({ description: "Erro interno" }),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(submitButton()).toBeEnabled();
    expect(screen.getByLabelText("Título")).toHaveValue(
      "Notebook para a analista",
    );
  });
});

describe("RequestForm edit", () => {
  const existing = makeRequest({
    id: 10,
    title: "Notebook novo",
    description: "Substituir o equipamento atual",
    priority: "high",
  });

  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    replace.mockReset();
    push.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("starts filled with the request and cancels back to its detail", () => {
    render(<RequestForm request={existing} />);

    expect(screen.getByLabelText("Título")).toHaveValue("Notebook novo");
    expect(screen.getByLabelText("Descrição")).toHaveValue(
      "Substituir o equipamento atual",
    );
    expect(screen.getByRole("radio", { name: "Alta" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/requests/10",
    );
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeInTheDocument();
  });

  it("patches the three fields, shows a toast and goes to the detail with replace", async () => {
    update.mockResolvedValue({ ...existing, title: "Notebook melhor" });
    const ui = userEvent.setup();
    render(<RequestForm request={existing} />);

    const title = screen.getByLabelText("Título");
    await ui.clear(title);
    await ui.type(title, "Notebook melhor");
    await ui.click(screen.getByRole("radio", { name: "Baixa" }));
    await ui.click(submitButton("Salvar alterações"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/10"));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(10, {
      title: "Notebook melhor",
      description: "Substituir o equipamento atual",
      priority: "low",
    });
    expect(create).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith("Alterações salvas");
    expect(push).not.toHaveBeenCalled();
  });

  it("on 409 shows the API message and goes back to the detail", async () => {
    update.mockRejectedValue(new ApiError(409, NOT_OPEN));
    const ui = userEvent.setup();
    render(<RequestForm request={existing} />);

    await ui.click(submitButton("Salvar alterações"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests/10"));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível salvar",
      expect.objectContaining({ description: NOT_OPEN }),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("on 404 shows a toast and goes back to the list", async () => {
    update.mockRejectedValue(new ApiError(404, "Não encontrado"));
    const ui = userEvent.setup();
    render(<RequestForm request={existing} />);

    await ui.click(submitButton("Salvar alterações"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/requests"));
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("on 422 shows the field error and does not navigate", async () => {
    update.mockRejectedValue(
      new ApiError(422, "x", { title: ["Título inválido."] }),
    );
    const ui = userEvent.setup();
    render(<RequestForm request={existing} />);

    await ui.click(submitButton("Salvar alterações"));

    expect(await screen.findByText("Título inválido.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
