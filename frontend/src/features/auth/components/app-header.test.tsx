import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/lib/types";

import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";

const logout = vi.fn();
let pathname = "/requests";
let role: Role = "requester";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: "Maria Silva",
      email: "maria@empresa.com",
      role,
      area: { id: 1, name: "TI" },
    },
    logout,
  }),
}));

function nav() {
  return within(screen.getByRole("navigation", { name: "Principal" }));
}

describe("AppHeader", () => {
  beforeEach(() => {
    pathname = "/requests";
    role = "requester";
  });

  it("hides Painel from the requester", () => {
    render(<AppHeader />);

    expect(nav().queryByText("Painel")).not.toBeInTheDocument();
    expect(nav().getByText("Solicitações")).toBeInTheDocument();
  });

  it.each(["analyst", "admin"] as const)("shows Painel to %s", (value) => {
    role = value;
    render(<AppHeader />);

    expect(nav().getByText("Painel")).toBeInTheDocument();
    expect(nav().getByText("Solicitações")).toBeInTheDocument();
  });

  it("marks the active route with aria-current", () => {
    role = "analyst";
    pathname = "/dashboard";
    render(<AppHeader />);

    expect(nav().getByRole("link", { name: "Painel" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      nav().getByRole("link", { name: "Solicitações" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the active route on a sub-route", () => {
    pathname = "/requests/123";
    render(<AppHeader />);

    expect(nav().getByRole("link", { name: "Solicitações" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("UserMenu", () => {
  beforeEach(() => {
    logout.mockReset();
    pathname = "/requests";
    role = "requester";
  });

  async function open() {
    const ui = userEvent.setup();
    render(<UserMenu />);
    await ui.click(screen.getByRole("button", { name: /Menu da conta/ }));
    return ui;
  }

  it("hides Painel from the requester", async () => {
    await open();

    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
    expect(await screen.findByText("Solicitações")).toBeInTheDocument();
  });

  it.each(["analyst", "admin"] as const)(
    "shows Painel to %s",
    async (value) => {
      role = value;
      await open();

      expect(await screen.findByText("Painel")).toBeInTheDocument();
    },
  );

  it("marks the active route, including sub-routes", async () => {
    pathname = "/requests/123";
    await open();

    const link = (await screen.findByText("Solicitações")).closest("a");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("calls logout when Sair is chosen", async () => {
    logout.mockResolvedValue(undefined);
    const ui = await open();

    await ui.click(await screen.findByRole("menuitem", { name: "Sair" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
