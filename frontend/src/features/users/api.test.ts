import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import {
  acceptInvitation,
  createInvitation,
  getInvitation,
  listAreas,
} from "./api";

const assign = vi.fn();
const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("users api", () => {
  beforeEach(() => {
    assign.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listAreas GETs /api/areas and unwraps data", async () => {
    fetchMock.mockResolvedValue(json({ data: [{ id: 1, name: "TI" }] }));

    await expect(listAreas()).resolves.toEqual([{ id: 1, name: "TI" }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/areas$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  it("createInvitation POSTs the payload to /api/invitations", async () => {
    const payload = {
      name: "Ana",
      email: "ana@empresa.com",
      role: "analyst" as const,
      area_id: 2,
    };
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("csrf-cookie")
        ? new Response(null, { status: 204 })
        : json({ data: { ...payload, area: { id: 2, name: "Ops" } } }, 201),
    );

    const result = await createInvitation(payload);

    expect(result.email).toBe("ana@empresa.com");
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(String(url)).toMatch(/\/api\/invitations$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("getInvitation GETs the token route, encoding the token", async () => {
    fetchMock.mockResolvedValue(
      json({ data: { name: "Ana", email: "a@b.co" } }),
    );

    await getInvitation("a/b c");

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/invitations\/a%2Fb%20c$/);
  });

  it("getInvitation rejects a 404 without redirecting", async () => {
    fetchMock.mockResolvedValue(json({ message: "gone" }, 404));

    await expect(getInvitation("tok")).rejects.toBeInstanceOf(ApiError);
    expect(assign).not.toHaveBeenCalled();
  });

  it("getInvitation does not redirect on 401", async () => {
    fetchMock.mockResolvedValue(json({}, 401));

    await expect(getInvitation("tok")).rejects.toBeInstanceOf(ApiError);
    expect(assign).not.toHaveBeenCalled();
  });

  it("acceptInvitation fetches the CSRF cookie, then POSTs the passwords", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("csrf-cookie")
        ? new Response(null, { status: 204 })
        : json({ data: { id: 1, role: "requester" } }, 201),
    );
    const input = {
      password: "secret-123",
      password_confirmation: "secret-123",
    };

    const user = await acceptInvitation("tok123", input);

    expect(user).toEqual({ id: 1, role: "requester" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/sanctum\/csrf-cookie$/,
    );
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toMatch(/\/api\/invitations\/tok123\/accept$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it.each([401, 419])(
    "acceptInvitation rejects on %i without redirecting to the expired page",
    async (status) => {
      fetchMock.mockImplementation(async (url: string) =>
        String(url).includes("csrf-cookie")
          ? new Response(null, { status: 204 })
          : json({}, status),
      );

      await expect(
        acceptInvitation("tok", { password: "x", password_confirmation: "x" }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(assign).not.toHaveBeenCalled();
    },
  );
});
