import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboard } from "@/features/dashboard/api";
import {
  emptyDashboard,
  makeDashboard,
} from "@/features/dashboard/test-fixtures";

import DashboardPage from "./page";

vi.mock("@/features/dashboard/api", () => ({ getDashboard: vi.fn() }));

const get = vi.mocked(getDashboard);

describe("DashboardPage", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("shows the skeleton with aria-busy while loading", () => {
    get.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Carregando o painel…")).toBeInTheDocument();
  });

  it("shows each card number and the priority bars from the API", async () => {
    get.mockResolvedValue(makeDashboard());
    const { container } = render(<DashboardPage />);

    const total = await screen.findByRole("link", {
      name: /^Total: 23 solicitações/,
    });
    expect(total).toHaveTextContent("23");
    const expected: [string, string][] = [
      ["Abertas", "8"],
      ["Em Análise", "6"],
      ["Aprovadas", "6"],
      ["Rejeitadas", "3"],
    ];
    for (const [label, n] of expected) {
      const link = screen.getByRole("link", {
        name: new RegExp(`^${label}: ${n} solicitações`),
      });
      expect(link).toHaveTextContent(n);
    }

    const items = within(
      screen.getByRole("region", { name: "Por prioridade" }),
    ).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("7 · 30%"),
      expect.stringContaining("10 · 43%"),
      expect.stringContaining("6 · 26%"),
    ]);
    expect(items[0]).toHaveTextContent("Alta");
    expect(items[1]).toHaveTextContent("Média");
    expect(items[2]).toHaveTextContent("Baixa");
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("shows zeros and the empty message when there are no requests", async () => {
    get.mockResolvedValue(emptyDashboard);
    render(<DashboardPage />);

    expect(
      await screen.findByText(
        "Sem solicitações para distribuir por prioridade.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Total: 0 solicitações. Ver todas" }),
    ).toBeInTheDocument();
  });

  it("shows the error and retries until the numbers appear", async () => {
    get.mockRejectedValueOnce(new Error("down"));
    get.mockResolvedValueOnce(makeDashboard());
    const ui = userEvent.setup();
    render(<DashboardPage />);

    expect(
      await screen.findByText("Não foi possível carregar o painel"),
    ).toBeInTheDocument();

    await ui.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /^Total: 23 solicitações/ }),
      ).toBeInTheDocument(),
    );
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Não foi possível carregar o painel")).toBeNull();
  });
});
