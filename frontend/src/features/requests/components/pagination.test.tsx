import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeMeta } from "@/features/requests/test-fixtures";

import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("shows the page text from the meta", () => {
    render(
      <Pagination
        meta={makeMeta({ current_page: 2, last_page: 5 })}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
  });

  it("disables 'Anterior' on the first page", () => {
    render(
      <Pagination
        meta={makeMeta({ current_page: 1, last_page: 3 })}
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeEnabled();
  });

  it("disables 'Próxima' on the last page", () => {
    render(
      <Pagination
        meta={makeMeta({ current_page: 3, last_page: 3 })}
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeEnabled();
  });

  it("goes to the previous and the next page", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        meta={makeMeta({ current_page: 2, last_page: 3 })}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Página anterior" }),
    );
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Próxima página" }),
    );
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it("does not call back from a disabled button", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        meta={makeMeta({ current_page: 1, last_page: 2 })}
        onPageChange={onPageChange}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Página anterior" }),
    );

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
