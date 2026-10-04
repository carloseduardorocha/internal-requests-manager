import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it } from "vitest";

import Home from "./page";

function renderHome() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <Home />
    </ThemeProvider>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    // jsdom does not implement matchMedia, which next-themes calls on mount.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia;
  });

  it("renders the product name", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Solicitações Internas" }),
    ).toBeInTheDocument();
  });

  it("renders the theme toggle button", () => {
    renderHome();

    expect(
      screen.getByRole("button", { name: /ativar tema/i }),
    ).toBeInTheDocument();
  });

  it("toggles the theme when the button is clicked", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(
      screen.getByRole("button", { name: "Ativar tema escuro" }),
    );
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Ativar tema claro" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(
      screen.getByRole("button", { name: "Ativar tema escuro" }),
    ).toBeInTheDocument();
  });
});
