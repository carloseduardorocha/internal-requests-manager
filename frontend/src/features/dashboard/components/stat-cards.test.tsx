import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeDashboard } from "@/features/dashboard/test-fixtures";

import { StatCards } from "./stat-cards";

describe("StatCards", () => {
  it("links the total to the whole list", () => {
    render(<StatCards data={makeDashboard()} />);

    const link = screen.getByRole("link", {
      name: "Total: 23 solicitações. Ver todas",
    });
    expect(link).toHaveAttribute("href", "/requests");
  });

  it.each([
    ["Abertas", 8, "open"],
    ["Em Análise", 6, "in_review"],
    ["Aprovadas", 6, "approved"],
    ["Rejeitadas", 3, "rejected"],
  ])("links %s to the list filtered by %s", (label, n, status) => {
    render(<StatCards data={makeDashboard()} />);

    const link = screen.getByRole("link", {
      name: `${label}: ${n} solicitações. Ver na lista`,
    });
    expect(link).toHaveAttribute("href", `/requests?status=${status}`);
    expect(link).toHaveTextContent(String(n));
  });

  it("uses the singular when the count is 1", () => {
    render(
      <StatCards
        data={makeDashboard({
          total: 1,
          by_status: { open: 1, in_review: 0, approved: 0, rejected: 0 },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Total: 1 solicitação. Ver todas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Abertas: 1 solicitação. Ver na lista",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Aprovadas: 0 solicitações. Ver na lista",
      }),
    ).toBeInTheDocument();
  });
});
