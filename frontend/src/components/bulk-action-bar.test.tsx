import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BulkActionBar } from "./bulk-action-bar";

function setup(props: { count: number; busy?: boolean }) {
  const onClear = vi.fn();
  render(
    <BulkActionBar
      count={props.count}
      busy={props.busy ?? false}
      onClear={onClear}
    >
      <button>Assumir</button>
    </BulkActionBar>,
  );
  return onClear;
}

describe("BulkActionBar", () => {
  it("is hidden with nothing selected", () => {
    setup({ count: 0 });

    expect(screen.queryByRole("region", { name: "Ações em massa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Assumir" })).toBeNull();
  });

  it("says '1 selecionada' for one", () => {
    setup({ count: 1 });

    expect(
      screen.getByRole("region", { name: "Ações em massa" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 selecionada")).toBeInTheDocument();
  });

  it("says 'N selecionadas' for more than one", () => {
    setup({ count: 4 });

    expect(screen.getByText("4 selecionadas")).toBeInTheDocument();
  });

  it("announces the count politely", () => {
    setup({ count: 2 });

    expect(screen.getByText("2 selecionadas")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("renders the feature's buttons and clears on 'Limpar seleção'", async () => {
    const onClear = setup({ count: 2 });

    expect(screen.getByRole("button", { name: "Assumir" })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Limpar seleção" }),
    );

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("disables 'Limpar seleção' while busy", async () => {
    const onClear = setup({ count: 2, busy: true });
    const clear = screen.getByRole("button", { name: "Limpar seleção" });

    expect(clear).toBeDisabled();
    await userEvent.click(clear);
    expect(onClear).not.toHaveBeenCalled();
  });

  it("keeps 'Limpar seleção' enabled when not busy", () => {
    setup({ count: 2 });

    expect(
      screen.getByRole("button", { name: "Limpar seleção" }),
    ).toBeEnabled();
  });
});
