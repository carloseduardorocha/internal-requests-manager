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

describe("AppHeader active item style", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    role = "analyst";
  });

  it("styles the active item with primary text and an underline, not a fill", () => {
    render(<AppHeader />);
    const active = nav().getByRole("link", { name: "Painel" });

    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("aria-[current=page]:text-primary");
    expect(active.className).toContain("aria-[current=page]:after:bg-primary");
    expect(active.className).not.toContain("aria-[current=page]:bg-accent");
    expect(active.className).not.toContain("hover:bg-accent");
  });

  it("gives the active item a primary-hover text and underline on hover", () => {
    render(<AppHeader />);
    const active = nav().getByRole("link", { name: "Painel" });

    expect(active.className).toContain(
      "aria-[current=page]:hover:text-primary-hover",
    );
    expect(active.className).toContain(
      "aria-[current=page]:hover:after:bg-primary-hover",
    );
  });

  it("keeps the underline transparent on the inactive items", () => {
    render(<AppHeader />);
    const inactive = nav().getByRole("link", { name: "Solicitações" });

    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive.className).toContain("after:bg-transparent");
    expect(inactive.className).toContain("hover:text-primary");
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
