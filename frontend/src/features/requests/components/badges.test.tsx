import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeRequest } from "@/features/requests/test-fixtures";
import type {
  InternalRequestPriority,
  InternalRequestStatus,
  StatusChange,
} from "@/features/requests/types";

import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { StatusTimeline } from "./status-timeline";

describe("StatusBadge", () => {
  it.each([
    ["open", "Aberta"],
    ["in_review", "Em Análise"],
    ["approved", "Aprovada"],
    ["rejected", "Rejeitada"],
  ] as [InternalRequestStatus, string][])(
    "shows %s as text plus a decorative icon, never only color",
    (status, label) => {
      const { container } = render(<StatusBadge status={status} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    },
  );
});

describe("PriorityBadge", () => {
  it.each([
    ["high", "Alta"],
    ["medium", "Média"],
    ["low", "Baixa"],
  ] as [InternalRequestPriority, string][])(
    "shows %s as text plus a decorative arrow",
    (priority, label) => {
      const { container } = render(<PriorityBadge priority={priority} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    },
  );
});

describe("StatusTimeline", () => {
  const history: StatusChange[] = [
    {
      from_status: null,
      to_status: "open",
      changed_by: { id: 1, name: "Ana Souza" },
      created_at: "2026-10-03T13:00:00.000000Z",
    },
    {
      from_status: "open",
      to_status: "in_review",
      changed_by: { id: 5, name: "Bruno Lima" },
      created_at: "2026-10-03T14:00:00.000000Z",
    },
    {
      from_status: "in_review",
      to_status: "approved",
      changed_by: { id: 5, name: "Bruno Lima" },
      created_at: "2026-10-03T15:00:00.000000Z",
    },
  ];

  it("shows one entry per change, in order, with who and when", () => {
    render(<StatusTimeline history={history} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Aberta");
    expect(items[0]).toHaveTextContent("Ana Souza");
    expect(items[1]).toHaveTextContent("Em Análise");
    expect(items[2]).toHaveTextContent("Aprovada");
    expect(
      within(items[2]).getByText(/Bruno Lima · \d{2}\/\d{2}\/2026 \d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  it("renders nothing for an empty history", () => {
    render(<StatusTimeline history={makeRequest({ history: [] }).history!} />);

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
