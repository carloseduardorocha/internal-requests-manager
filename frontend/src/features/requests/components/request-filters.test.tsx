import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeMeta } from "@/features/requests/test-fixtures";
import type { InternalRequestFilters } from "@/features/requests/types";

import { RequestFilters } from "./request-filters";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/requests",
}));

const defaults: InternalRequestFilters = {
  search: "",
  status: "",
  priority: "",
  sort: "-created_at",
  page: 1,
};

function setup(
  filters: Partial<InternalRequestFilters> = {},
  meta: ReturnType<typeof makeMeta> | null = null,
) {
  return render(
    <RequestFilters filters={{ ...defaults, ...filters }} meta={meta} />,
  );
}

// user-event waits on timers, which are faked here: use fireEvent instead.
function type(value: string) {
  fireEvent.change(screen.getByLabelText("Pesquisar"), {
    target: { value },
  });
}

function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function clickClear() {
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("RequestFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 300 ms after the last key before searching", () => {
    setup();

    type("note");
    expect(replace).not.toHaveBeenCalled();

    advance(299);
    expect(replace).not.toHaveBeenCalled();

    advance(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/requests?search=note");
  });

  it("restarts the wait on each key, so only one search is sent", () => {
    setup();

    type("no");
    advance(200);
    type("note");
    advance(200);
    expect(replace).not.toHaveBeenCalled();

    advance(100);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/requests?search=note");
  });

  it("uses replace (never push) and goes back to page 1 when searching", () => {
    setup({ status: "open", page: 3 });

    type("x");
    advance(300);

    expect(replace).toHaveBeenCalledWith("/requests?search=x&status=open");
  });

  it("does not search for blanks only", () => {
    setup();

    type("   ");
    advance(1000);

    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the current search in the input", () => {
    setup({ search: "monitor" });

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("monitor");
  });

  it("offers every status, priority and sort option", () => {
    setup();

    const options = (label: string) =>
      Array.from(
        (screen.getByLabelText(label) as HTMLSelectElement).options,
      ).map((option) => option.text);

    expect(options("Status")).toEqual([
      "Todos",
      "Aberta",
      "Em Análise",
      "Aprovada",
      "Rejeitada",
    ]);
    expect(options("Prioridade")).toEqual(["Todas", "Alta", "Média", "Baixa"]);
    expect(options("Ordenar por")).toEqual(["Mais recentes", "Mais antigas"]);
  });

  it("applies the status immediately, keeping the other filters and resetting the page", () => {
    setup({ search: "a", priority: "high", page: 4 });

    choose("Status", "approved");

    expect(replace).toHaveBeenCalledWith(
      "/requests?search=a&status=approved&priority=high",
    );
  });

  it("applies the priority immediately, keeping the other filters", () => {
    setup({ status: "open", page: 2 });

    choose("Prioridade", "low");

    expect(replace).toHaveBeenCalledWith("/requests?status=open&priority=low");
  });

  it("applies the sort and writes it in the URL", () => {
    setup({ status: "open" });

    choose("Ordenar por", "created_at");

    expect(replace).toHaveBeenCalledWith(
      "/requests?status=open&sort=created_at",
    );
  });

  it("clears a status back to the bare path", () => {
    setup({ status: "open" });

    choose("Status", "");

    expect(replace).toHaveBeenCalledWith("/requests");
  });

  it("shows the selected values", () => {
    setup({ status: "rejected", priority: "medium", sort: "created_at" });

    expect(screen.getByLabelText("Status")).toHaveValue("rejected");
    expect(screen.getByLabelText("Prioridade")).toHaveValue("medium");
    expect(screen.getByLabelText("Ordenar por")).toHaveValue("created_at");
  });

  it("hides 'Limpar filtros' when no filter is active", () => {
    setup({ sort: "created_at", page: 2 });

    expect(
      screen.queryByRole("button", { name: "Limpar filtros" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { search: "a" },
    { status: "open" as const },
    { priority: "high" as const },
  ])("shows 'Limpar filtros' with %j and clears everything", (patch) => {
    setup({ ...patch, sort: "created_at", page: 3 });

    clickClear();

    expect(replace).toHaveBeenCalledWith("/requests");
  });

  it("empties the search box when clearing", () => {
    setup({ search: "monitor" });

    clickClear();

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("");
  });

  it("shows the result count from the meta", () => {
    setup(
      {},
      makeMeta({ total: 40, from: 1, to: 15, last_page: 3, per_page: 15 }),
    );

    expect(
      screen.getByText("Mostrando 1–15 de 40 solicitações"),
    ).toBeInTheDocument();
  });

  it("uses the singular for one result", () => {
    setup({}, makeMeta({ total: 1 }));

    expect(screen.getByText("1 solicitação encontrada")).toBeInTheDocument();
  });

  it("says nothing was found for zero results", () => {
    setup({ status: "open" }, makeMeta({ total: 0, from: null, to: null }));

    expect(
      screen.getByText("Nenhuma solicitação encontrada"),
    ).toBeInTheDocument();
  });

  it("does not show a count without meta", () => {
    setup();

    expect(screen.queryByText(/solicitaç(ão|ões) encontrada/)).toBeNull();
    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });

  it("limits the search box to 255 characters", () => {
    setup();

    expect(screen.getByLabelText("Pesquisar")).toHaveAttribute(
      "maxlength",
      "255",
    );
  });

  it("keeps what was typed while the navigation of an earlier search catches up", () => {
    const view = setup();

    type("note");
    advance(300);
    expect(replace).toHaveBeenCalledWith("/requests?search=note");

    // The user keeps typing before the URL answers.
    type("noteb");
    view.rerender(
      <RequestFilters filters={{ ...defaults, search: "note" }} meta={null} />,
    );

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("noteb");
  });

  it("still follows a search that did not come from typing (back button)", () => {
    const view = setup();

    type("note");
    advance(300);
    view.rerender(
      <RequestFilters filters={{ ...defaults, search: "other" }} meta={null} />,
    );

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("other");
  });
});
