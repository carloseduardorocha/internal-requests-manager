import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  RequestListEmpty,
  RequestListError,
  RequestListNoResults,
  RequestListSkeleton,
} from "./request-list-states";

describe("RequestListSkeleton", () => {
  it("is marked as busy and announces the loading", () => {
    const { container } = render(<RequestListSkeleton />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Carregando solicitações…")).toBeInTheDocument();
  });
});

describe("RequestListEmpty", () => {
  it("tells the requester they have not opened any request, with the create button", () => {
    render(<RequestListEmpty role="requester" canCreate />);

    expect(
      screen.getByText("Você ainda não abriu nenhuma solicitação"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Nova solicitação" }),
    ).toHaveAttribute("href", "/requests/new");
  });

  it("shows the generic text and keeps the button for the admin", () => {
    render(<RequestListEmpty role="admin" canCreate />);

    expect(
      screen.getByText("Nenhuma solicitação por aqui"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Você ainda não abriu nenhuma solicitação"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Nova solicitação" }),
    ).toBeInTheDocument();
  });

  it("shows the generic text without the button for the analyst", () => {
    render(<RequestListEmpty role="analyst" canCreate={false} />);

    expect(
      screen.getByText("Nenhuma solicitação por aqui"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("RequestListNoResults", () => {
  it("mentions the search term and offers to clear the filters", async () => {
    const onClear = vi.fn();
    render(<RequestListNoResults search="monitor" onClear={onClear} />);

    expect(
      screen.getByText("Nenhuma solicitação encontrada"),
    ).toBeInTheDocument();
    expect(screen.getByText(/monitor/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Limpar filtros" }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("uses a text about the filters when there is no search term", () => {
    render(<RequestListNoResults search="" onClear={vi.fn()} />);

    expect(screen.getByText(/corresponde aos filtros/)).toBeInTheDocument();
  });
});

describe("RequestListError", () => {
  it("shows the error and retries on click", async () => {
    const onRetry = vi.fn();
    render(<RequestListError onRetry={onRetry} />);

    expect(
      screen.getByText("Não foi possível carregar as solicitações"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
