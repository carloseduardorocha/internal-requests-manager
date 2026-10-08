import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { forgotPassword, logout, resetPassword } from "./api";

const assign = vi.fn();
const fetchMock = vi.fn();

describe("logout", () => {
  beforeEach(() => {
    assign.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([401, 419])(
    "rejects on %i without redirecting to the expired page",
    async (status) => {
      fetchMock.mockImplementation(
        async () => new Response(JSON.stringify({}), { status }),
      );

      await expect(logout()).rejects.toBeInstanceOf(ApiError);

      expect(assign).not.toHaveBeenCalled();
    },
  );
});

describe.each([
  ["forgotPassword", "/api/forgot-password", { email: "a@b.co" }],
  [
    "resetPassword",
    "/api/reset-password",
    {
      token: "tok",
      email: "a@b.co",
      password: "new-secret-1",
      password_confirmation: "new-secret-1",
      logout_other_devices: true,
    },
  ],
] as const)("%s", (name, route, payload) => {
  const call = () =>
    name === "forgotPassword"
      ? forgotPassword("a@b.co")
      : resetPassword(payload as Parameters<typeof resetPassword>[0]);

  beforeEach(() => {
    assign.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the CSRF cookie, then POSTs the payload to the route", async () => {
    await call();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [csrfUrl] = fetchMock.mock.calls[0];
    expect(String(csrfUrl)).toMatch(/\/sanctum\/csrf-cookie$/);

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(new RegExp(`${route}$`));
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it.each([401, 419])(
    "rejects on %i without redirecting to the expired page",
    async (status) => {
      fetchMock.mockImplementation(async (url: string) =>
        String(url).includes("csrf-cookie")
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify({}), { status }),
      );

      await expect(call()).rejects.toBeInstanceOf(ApiError);

      expect(assign).not.toHaveBeenCalled();
    },
  );
});
