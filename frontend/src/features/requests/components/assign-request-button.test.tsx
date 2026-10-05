import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { assignInternalRequest } from "@/features/requests/api";
import { makeRequest } from "@/features/requests/test-fixtures";
import { ApiError } from "@/lib/api";

import { AssignRequestButton } from "./assign-request-button";

const toastSuccess = vi.fn();
const toastError = vi.fn();
const onRefresh = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/features/requests/api", () => ({
  assignInternalRequest: vi.fn(),
}));

const assign = vi.mocked(assignInternalRequest);

function clickAssign() {
  render(<AssignRequestButton requestId={10} onRefresh={onRefresh} />);
  return userEvent.click(
    screen.getByRole("button", { name: "Assumir análise" }),
  );
}

describe("AssignRequestButton", () => {
  beforeEach(() => {
    assign.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    onRefresh.mockReset();
  });

  it("assigns, shows the toast and asks the screen to reload", async () => {
    assign.mockResolvedValue(makeRequest({ status: "in_review" }));
    await clickAssign();

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(10);
    expect(toastSuccess).toHaveBeenCalledWith("Análise assumida");
    expect(toastError).not.toHaveBeenCalled();
    // Stays busy until the screen swaps the button out.
    expect(screen.getByRole("button", { name: "Assumindo…" })).toBeDisabled();
  });

  it("is disabled with 'Assumindo…' while sending", async () => {
    assign.mockImplementation(() => new Promise(() => {}));
    await clickAssign();

    const busy = await screen.findByRole("button", { name: "Assumindo…" });
    expect(busy).toBeDisabled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("enables the button again after a failure", async () => {
    assign.mockRejectedValue(new TypeError("network"));
    await clickAssign();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Assumir análise" }),
    ).toBeEnabled();
  });

  it("on 409 shows the API message and reloads", async () => {
    assign.mockRejectedValue(
      new ApiError(409, "Este pedido já foi assumido por outro analista."),
    );
    await clickAssign();

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível assumir",
      expect.objectContaining({
        description: "Este pedido já foi assumido por outro analista.",
      }),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it.each([401, 419])(
    "on %s shows no toast and does not reload",
    async (status) => {
      assign.mockRejectedValue(new ApiError(status, "Sessão expirada"));
      await clickAssign();

      await waitFor(() => expect(assign).toHaveBeenCalled());
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Assumir análise" }),
        ).toBeEnabled(),
      );
      expect(toastError).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
    },
  );

  it("on a network error shows the generic toast and does not reload", async () => {
    assign.mockRejectedValue(new TypeError("network"));
    await clickAssign();

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][1]).toEqual({
      description: "Não foi possível concluir a ação. Tente novamente.",
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
