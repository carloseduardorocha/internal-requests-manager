import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the product name and the theme toggle", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Solicitações Internas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Alternar tema" }),
    ).toBeInTheDocument();
  });
});
