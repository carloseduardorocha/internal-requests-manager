import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeMeta } from "@/features/requests/test-fixtures";
import { makeArea } from "@/features/users/test-fixtures";
import type { UserFilters as Filters } from "@/features/users/types";

import { UserFilters } from "./user-filters";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/users",
}));

const defaults: Filters = {
  search: "",
  role: "",
  area_id: null,
  status: "",
  page: 1,
};

const areas = [makeArea({ id: 1, name: "TI" }), makeArea({ id: 2 })];

function setup(
  filters: Partial<Filters> = {},
  meta: ReturnType<typeof makeMeta> | null = null,
) {
  return render(
    <UserFilters
      filters={{ ...defaults, ...filters }}
      areas={areas}
      meta={meta}
    />,
  );
}

// user-event waits on timers, which are faked here: use fireEvent instead.
function type(value: string) {
  fireEvent.change(screen.getByLabelText("Pesquisar"), { target: { value } });
}

function choose(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function options(label: string) {
  return Array.from(
    (screen.getByLabelText(label) as HTMLSelectElement).options,
  ).map((option) => option.text);
}

describe("UserFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers every role, area and status option", () => {
    setup();

    expect(options("Perfil")).toEqual([
      "Todos",
      "Solicitante",
      "Analista",
      "Administrador",
    ]);
    expect(options("Área")).toEqual(["Todas", "TI", "Financeiro"]);
    expect(options("Situação")).toEqual(["Todas", "Ativas", "Desativadas"]);
  });

  it("shows the selected values", () => {
    setup({ search: "ana", role: "admin", area_id: 2, status: "deactivated" });

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("ana");
    expect(screen.getByLabelText("Perfil")).toHaveValue("admin");
    expect(screen.getByLabelText("Área")).toHaveValue("2");
    expect(screen.getByLabelText("Situação")).toHaveValue("deactivated");
  });

  it("applies the role with the right parameter and goes back to page 1", () => {
    setup({ page: 4 });

    choose("Perfil", "analyst");

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/users?role=analyst");
  });

  it("applies the area with the right parameter and goes back to page 1", () => {
    setup({ page: 4 });

    choose("Área", "2");

    expect(replace).toHaveBeenCalledWith("/users?area_id=2");
  });

  it("applies the status with the right parameter and goes back to page 1", () => {
    setup({ page: 4 });

    choose("Situação", "active");

    expect(replace).toHaveBeenCalledWith("/users?status=active");
  });

  it("keeps the other filters when one changes", () => {
    setup({ search: "a", role: "admin", status: "active", page: 3 });

    choose("Área", "1");

    expect(replace).toHaveBeenCalledWith(
      "/users?search=a&role=admin&area_id=1&status=active",
    );
  });

  it("clears a select back to the bare path", () => {
    setup({ role: "admin" });

    choose("Perfil", "");
    expect(replace).toHaveBeenCalledWith("/users");
  });

  it("clears the area filter when 'Todas' is chosen", () => {
    setup({ area_id: 2, status: "active" });

    choose("Área", "");

    expect(replace).toHaveBeenCalledWith("/users?status=active");
  });

  it("waits 300 ms after the last key before searching", () => {
    setup();

    type("carla");
    advance(299);
    expect(replace).not.toHaveBeenCalled();

    advance(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/users?search=carla");
  });

  it("searches with replace, keeping the filters and resetting the page", () => {
    setup({ role: "admin", page: 3 });

    type("x");
    advance(300);

    expect(replace).toHaveBeenCalledWith("/users?search=x&role=admin");
  });

  it("does not search for blanks only", () => {
    setup();

    type("   ");
    advance(1000);

    expect(replace).not.toHaveBeenCalled();
  });

  it("limits the search box to 255 characters", () => {
    setup();

    expect(screen.getByLabelText("Pesquisar")).toHaveAttribute(
      "maxlength",
      "255",
    );
  });

  it("hides 'Limpar filtros' when no filter is active", () => {
    setup({ page: 2 });

    expect(
      screen.queryByRole("button", { name: "Limpar filtros" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { search: "a" },
    { role: "admin" as const },
    { area_id: 1 },
    { status: "active" as const },
  ])("shows 'Limpar filtros' with %j and clears everything", (patch) => {
    setup({ ...patch, page: 3 });

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(replace).toHaveBeenCalledWith("/users");
  });

  it("empties the search box when clearing", () => {
    setup({ search: "carla" });

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(screen.getByLabelText("Pesquisar")).toHaveValue("");
  });

  it("shows the result count from the meta", () => {
    setup(
      {},
      makeMeta({ total: 40, from: 1, to: 15, last_page: 3, per_page: 15 }),
    );

    expect(
      screen.getByText("Mostrando 1–15 de 40 usuários"),
    ).toBeInTheDocument();
  });

  it("uses the singular for one result", () => {
    setup({}, makeMeta({ total: 1 }));

    expect(screen.getByText("1 usuário encontrado")).toBeInTheDocument();
  });

  it("says nothing was found for zero results", () => {
    setup({ role: "admin" }, makeMeta({ total: 0, from: null, to: null }));

    expect(screen.getByText("Nenhum usuário encontrado")).toBeInTheDocument();
  });

  it("does not show a count without meta", () => {
    setup();

    expect(screen.queryByText(/usuários?\s+encontrad/)).toBeNull();
    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });
});
