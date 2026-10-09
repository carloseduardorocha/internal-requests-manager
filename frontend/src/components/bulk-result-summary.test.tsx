import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BulkResult } from "@/lib/bulk";

import { BulkResultSummary } from "./bulk-result-summary";

const skippedOne: BulkResult = {
  done: [1, 2],
  skipped: [
    { id: 3, reason: "not_open", message: "Este pedido já foi assumido." },
  ],
};

const skippedMany: BulkResult = {
  done: [1],
  skipped: [
    { id: 3, reason: "not_open", message: "Este pedido já foi assumido." },
    { id: 4, reason: "not_found", message: "Pedido não encontrado." },
  ],
};

function setup(result: BulkResult) {
  const onClose = vi.fn();
  render(
    <BulkResultSummary
      result={result}
      title="1 de 3 solicitações assumidas"
      labelFor={(id) => `#${id} Título ${id}`}
      onClose={onClose}
    />,
  );
  return onClose;
}

describe("BulkResultSummary", () => {
  it("shows the title and '1 ficou de fora:' for one skipped", () => {
    setup(skippedOne);

    expect(screen.getByText("1 de 3 solicitações assumidas")).toBeVisible();
    expect(screen.getByText("1 ficou de fora:")).toBeInTheDocument();
  });

  it("says 'N ficaram de fora:' for more than one", () => {
    setup(skippedMany);

    expect(screen.getByText("2 ficaram de fora:")).toBeInTheDocument();
  });

  it("lists labelFor(id) and the message of each skipped item", () => {
    setup(skippedMany);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("#3 Título 3");
    expect(items[0]).toHaveTextContent("Este pedido já foi assumido.");
    expect(items[1]).toHaveTextContent("#4 Título 4");
    expect(items[1]).toHaveTextContent("Pedido não encontrado.");
  });

  it("takes the focus when it appears", () => {
    setup(skippedOne);

    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("calls onClose from 'Fechar resumo'", async () => {
    const onClose = setup(skippedOne);

    await userEvent.click(
      screen.getByRole("button", { name: "Fechar resumo" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
