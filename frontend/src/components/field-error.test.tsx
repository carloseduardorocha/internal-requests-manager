import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "./field-error";

describe("FieldError", () => {
  it("renders the message with the given id and the 18px line height", () => {
    render(<FieldError id="title-error" message="O título é obrigatório." />);

    const error = screen.getByText("O título é obrigatório.");
    expect(error).toHaveAttribute("id", "title-error");
    expect(error).toHaveClass("leading-[18px]");
  });

  it.each([undefined, ""])("renders nothing for message %j", (message) => {
    const { container } = render(
      <FieldError id="title-error" message={message} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
