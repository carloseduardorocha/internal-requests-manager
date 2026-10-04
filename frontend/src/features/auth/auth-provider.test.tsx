import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { AuthProvider, useAuth } from "./auth-provider";

const replace = vi.fn();
const me = vi.fn();
const logoutRequest = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/features/auth/api", () => ({
  me: () => me(),
  logout: () => logoutRequest(),
}));

function Probe() {
  const { user, logout } = useAuth();
  return <button onClick={() => void logout()}>sair {user.name}</button>;
}

async function setup() {
  me.mockResolvedValue({
    id: 1,
    name: "Maria",
    email: "m@e.co",
    role: "requester",
    area: { id: 1, name: "TI" },
  });
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  return screen.findByRole("button", { name: "sair Maria" });
}

describe("AuthProvider logout", () => {
  beforeEach(() => {
    replace.mockReset();
    me.mockReset();
    logoutRequest.mockReset();
  });

  it("calls the API and goes to /login", async () => {
    logoutRequest.mockResolvedValue(undefined);
    const button = await setup();

    await userEvent.setup().click(button);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(logoutRequest).toHaveBeenCalledTimes(1);
  });

  it("goes to /login even when the call fails", async () => {
    logoutRequest.mockRejectedValue(new Error("network"));
    const button = await setup();

    await userEvent.setup().click(button);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});

describe("AuthProvider me failure", () => {
  beforeEach(() => {
    me.mockReset();
  });

  it("shows no failure alert on an expired session", async () => {
    me.mockRejectedValue(new ApiError(401, "Unauthenticated.", {}, null));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(me).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the failure alert with retry on a server error", async () => {
    me.mockRejectedValue(new ApiError(500, "Erro.", {}, null));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar sua conta.",
    );
    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
  });
});
