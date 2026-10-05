import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  emptyDashboard,
  makeDashboard,
} from "@/features/dashboard/test-fixtures";

import { PriorityDistribution } from "./priority-distribution";

describe("PriorityDistribution", () => {
  it("shows count and percentage per priority, High then Medium then Low", () => {
    render(<PriorityDistribution data={makeDashboard()} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Alta");
    expect(items[0]).toHaveTextContent("7 · 30%");
    expect(items[1]).toHaveTextContent("Média");
    expect(items[1]).toHaveTextContent("10 · 43%");
    expect(items[2]).toHaveTextContent("Baixa");
    expect(items[2]).toHaveTextContent("6 · 26%");
  });

  it("sets the fill rect width equal to the percentage", () => {
    render(<PriorityDistribution data={makeDashboard()} />);

    const widths = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelectorAll("rect")[1].getAttribute("width"));
    expect(widths).toEqual(["30", "43", "26"]);
  });

  it("shows the empty message and no bars when total is 0", () => {
    const { container } = render(
      <PriorityDistribution data={emptyDashboard} />,
    );

    expect(
      screen.getByText("Sem solicitações para distribuir por prioridade."),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(container.querySelector("rect")).toBeNull();
    expect(within(container).queryByText(/%/)).toBeNull();
  });
});
