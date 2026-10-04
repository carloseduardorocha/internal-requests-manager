import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "./api";

const assign = vi.fn();
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit };
}

function clearCookies() {
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (name)
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

describe("api", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse({ ok: true }));
    assign.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { assign });
    clearCookies();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials and the JSON Accept header on every call", async () => {
    await api.get("/api/me");
    await api.post("/api/logout");

    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).credentials).toBe("include");
      expect((init as RequestInit).headers).toMatchObject({
        Accept: "application/json",
      });
    }
  });

  it("sends the decoded XSRF token on writes", async () => {
    document.cookie = `XSRF-TOKEN=${encodeURIComponent("abc=def/ghi")}`;

    await api.post("/api/login", { a: 1 });
    expect(lastCall().init.headers).toMatchObject({
      "X-XSRF-TOKEN": "abc=def/ghi",
    });

    await api.patch("/api/x", {});
    expect(lastCall().init.headers).toMatchObject({
      "X-XSRF-TOKEN": "abc=def/ghi",
    });

    await api.delete("/api/x");
    expect(lastCall().init.headers).toMatchObject({
      "X-XSRF-TOKEN": "abc=def/ghi",
    });
  });

  it("does not send the XSRF token on GET", async () => {
    document.cookie = "XSRF-TOKEN=token";

    await api.get("/api/me");

    expect(lastCall().init.headers).not.toHaveProperty("X-XSRF-TOKEN");
  });

  it("serializes the body as JSON", async () => {
    await api.post("/api/login", { email: "a@b.co" });

    expect(lastCall().init.body).toBe(JSON.stringify({ email: "a@b.co" }));
    expect(lastCall().init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it.each([401, 419])(
    "redirects to the expired login on %i",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "x" }, status));

      await expect(api.get("/api/me")).rejects.toBeInstanceOf(ApiError);

      expect(assign).toHaveBeenCalledWith("/login?expired=1");
    },
  );

  it.each([401, 419])(
    "does not redirect on %i with redirectOnAuthError false",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "x" }, status));

      await expect(
        api.post("/api/login", {}, { redirectOnAuthError: false }),
      ).rejects.toMatchObject({ status });

      expect(assign).not.toHaveBeenCalled();
    },
  );

  it("does not redirect on other errors", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "x" }, 403));

    await expect(api.get("/api/x")).rejects.toMatchObject({ status: 403 });

    expect(assign).not.toHaveBeenCalled();
  });

  it("throws an ApiError with status, message and field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Inválido.", errors: { email: ["Erro"] } }, 422),
    );

    const error = await api.post("/api/login", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      message: "Inválido.",
      errors: { email: ["Erro"] },
      retryAfter: null,
    });
  });

  it("reads retryAfter from the Retry-After header", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Muitas tentativas." }, 429, {
        "Retry-After": "900",
      }),
    );

    await expect(api.post("/api/login", {})).rejects.toMatchObject({
      status: 429,
      retryAfter: 900,
    });
  });

  it("uses a default message when the body has none", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    const error = (await api
      .get("/api/x")
      .catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(500);
    expect(error.message).not.toBe("");
    expect(error.errors).toEqual({});
  });

  it("drops empty, null and undefined values from the query", async () => {
    await api.get("/api/requests", {
      query: { a: "", b: null, c: undefined, d: "x", e: 0, f: false },
    });

    const url = new URL(lastCall().url);
    expect(url.searchParams.has("a")).toBe(false);
    expect(url.searchParams.has("b")).toBe(false);
    expect(url.searchParams.has("c")).toBe(false);
    expect(url.searchParams.get("d")).toBe("x");
    expect(url.searchParams.get("e")).toBe("0");
    expect(url.searchParams.get("f")).toBe("false");
  });

  it("adds no question mark when the query ends up empty", async () => {
    await api.get("/api/requests", { query: { a: "", b: null } });

    expect(lastCall().url).not.toContain("?");
  });

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.post("/api/logout")).resolves.toBeUndefined();
  });

  it("returns the parsed body on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1 } }));

    await expect(api.get("/api/me")).resolves.toEqual({ data: { id: 1 } });
  });

  it("stores nothing in localStorage or sessionStorage", async () => {
    document.cookie = "XSRF-TOKEN=token";
    await api.post("/api/login", { password: "secret" });
    fetchMock.mockResolvedValue(jsonResponse({ message: "x" }, 401));
    await api.get("/api/me").catch(() => {});

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
