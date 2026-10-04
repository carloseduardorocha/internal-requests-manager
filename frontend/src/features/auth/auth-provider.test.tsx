import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
