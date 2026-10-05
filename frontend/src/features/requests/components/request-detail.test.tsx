import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeRequest } from "@/features/requests/test-fixtures";

import { RequestDetail } from "./request-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/features/requests/api", () => ({
  deleteInternalRequest: vi.fn(),
}));

function renderDetail(overrides = {}) {
  return render(
    <RequestDetail request={makeRequest(overrides)} onConflict={vi.fn()} />,
  );
}

describe("RequestDetail actions", () => {
  it("shows 'Editar' and 'Excluir' when the API allows both", () => {
    renderDetail({ can: { update: true, delete: true } });

    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/requests/10/edit",
    );
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("hides both actions when the API allows neither (not Open, or an analyst)", () => {
    renderDetail({
      status: "in_review",
      can: { update: false, delete: false },
    });

    expect(
      screen.queryByRole("link", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Excluir" }),
    ).not.toBeInTheDocument();
  });

  it("follows each flag on its own", () => {
    const { unmount } = renderDetail({ can: { update: true, delete: false } });
    expect(screen.getByRole("link", { name: "Editar" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Excluir" }),
    ).not.toBeInTheDocument();
    unmount();

    renderDetail({ can: { update: false, delete: true } });
    expect(
      screen.queryByRole("link", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });
});

describe("RequestDetail content", () => {
  it("shows the header and the data", () => {
    renderDetail({
      id: 42,
      title: "Monitor extra",
      description: "Linha um\nLinha dois",
      priority: "high",
      status: "open",
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Monitor extra" }),
    ).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText(/Linha um/)).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();

    const data = screen.getByText("Dados").closest("section")!;
    expect(within(data).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(data).getByText("Financeiro")).toBeInTheDocument();
    expect(
      within(data).getByText(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  it("says nobody took the request when there is no assignee", () => {
    renderDetail({ assigned_to: null, assigned_at: null });

    expect(screen.getByText("Ainda ninguém assumiu")).toBeInTheDocument();
  });

  it("shows the assignee and since when", () => {
    renderDetail({
      status: "in_review",
      assigned_to: { id: 5, name: "Bruno Lima" },
      assigned_at: "2026-10-03T14:00:00.000000Z",
      can: { update: false, delete: false },
    });

    const data = screen.getByText("Dados").closest("section")!;
    expect(within(data).getByText(/Bruno Lima/)).toBeInTheDocument();
    expect(
      within(data).getByText(/desde \d{2}\/\d{2}\/2026/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ainda ninguém assumiu")).not.toBeInTheDocument();
  });

  it("shows a waiting message in place of the decision for an Open request", () => {
    renderDetail({ status: "open", decision: null });

    const section = screen.getByText("Decisão").closest("section")!;
    expect(within(section).getByText(/Aguardando/)).toBeInTheDocument();
  });

  it("shows the decision with justification, author and date", () => {
    renderDetail({
      status: "approved",
      assigned_to: { id: 5, name: "Bruno Lima" },
      assigned_at: "2026-10-03T14:00:00.000000Z",
      decision: {
        decided_by: { id: 5, name: "Bruno Lima" },
        decided_at: "2026-10-03T15:00:00.000000Z",
        justification: "Dentro do orçamento",
      },
      can: { update: false, delete: false },
    });

    const section = screen.getByText("Decisão").closest("section")!;
    expect(within(section).getByText("Aprovada")).toBeInTheDocument();
    expect(
      within(section).getByText("Dentro do orçamento"),
    ).toBeInTheDocument();
    expect(
      within(section).getByText(/Bruno Lima · \d{2}\/\d{2}\/2026 \d{2}:\d{2}/),
    ).toBeInTheDocument();
    expect(within(section).queryByText(/Aguardando/)).not.toBeInTheDocument();
  });

  it("shows a rejected decision with its justification", () => {
    renderDetail({
      status: "rejected",
      decision: {
        decided_by: { id: 5, name: "Bruno Lima" },
        decided_at: "2026-10-03T15:00:00.000000Z",
        justification: "Fora do orçamento",
      },
      can: { update: false, delete: false },
    });

    const section = screen.getByText("Decisão").closest("section")!;
    expect(within(section).getByText("Rejeitada")).toBeInTheDocument();
    expect(within(section).getByText("Fora do orçamento")).toBeInTheDocument();
  });

  it("shows one timeline entry per history item", () => {
    renderDetail({
      status: "approved",
      history: [
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
      ],
      can: { update: false, delete: false },
    });

    const section = screen.getByText("Histórico").closest("section")!;
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
  });

  it("does not break without history", () => {
    renderDetail({ history: undefined });

    const section = screen.getByText("Histórico").closest("section")!;
    expect(within(section).queryByRole("listitem")).not.toBeInTheDocument();
  });
});
