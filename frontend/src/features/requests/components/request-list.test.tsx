import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeRequest } from "@/features/requests/test-fixtures";
import type { Role } from "@/lib/types";

import { RequestList } from "./request-list";

let role: Role = "requester";

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({ user: { role } }),
}));

const requests = [
  makeRequest({
    id: 10,
    title: "Notebook novo",
    priority: "high",
    status: "open",
  }),
  makeRequest({
    id: 11,
    title: "Licença de software",
    priority: "low",
    status: "approved",
    requester: { id: 2, name: "Bruno Lima" },
    area: { id: 3, name: "Marketing" },
  }),
];

describe("RequestList", () => {
  it("renders one link per request to its detail", () => {
    role = "analyst";
    render(<RequestList requests={requests} />);

    const first = screen.getByRole("link", { name: /Notebook novo/ });
    const second = screen.getByRole("link", { name: /Licença de software/ });
    expect(first).toHaveAttribute("href", "/requests/10");
    expect(second).toHaveAttribute("href", "/requests/11");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("shows id, status, priority and the creation date in each row", () => {
    role = "analyst";
    render(<RequestList requests={[requests[0]]} />);

    const row = screen.getByRole("link", { name: /Notebook novo/ });
    expect(row).toHaveTextContent("#10");
    expect(row).toHaveTextContent("Aberta");
    expect(row).toHaveTextContent("Alta");
    expect(row.textContent).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(row.textContent).toMatch(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/);
  });

  it("shows the requester and the area to the analyst", () => {
    role = "analyst";
    render(<RequestList requests={requests} />);

    expect(screen.getByText("Ana Souza · Financeiro")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima · Marketing")).toBeInTheDocument();
  });

  it("shows the requester and the area to the admin", () => {
    role = "admin";
    render(<RequestList requests={requests} />);

    expect(screen.getByText("Ana Souza · Financeiro")).toBeInTheDocument();
  });

  it("hides the requester and the area from the requester", () => {
    role = "requester";
    render(<RequestList requests={requests} />);

    expect(screen.queryByText(/Ana Souza/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Financeiro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Marketing/)).not.toBeInTheDocument();
    expect(screen.getByText("Notebook novo")).toBeInTheDocument();
  });

  it("labels the columns", () => {
    role = "analyst";
    render(<RequestList requests={requests} />);

    for (const column of ["Solicitação", "Prioridade", "Status", "Criada em"]) {
      expect(screen.getByText(column)).toBeInTheDocument();
    }
  });
});
