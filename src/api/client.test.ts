import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, catalog, __testing } from "./client";

const { toQuery } = __testing;

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("toQuery", () => {
  it("joins a list into one comma separated value", () => {
    expect(toQuery({ subject: ["COMP", "MATH"] })).toBe("?subject=COMP%2CMATH");
  });

  it("drops an empty list, which would otherwise filter everything out", () => {
    expect(toQuery({ subject: [], term_uid: 202710 })).toBe("?term_uid=202710");
  });

  it("drops undefined, null, and empty strings", () => {
    expect(toQuery({ a: undefined, b: null, c: "", d: 1 })).toBe("?d=1");
  });

  it("keeps a false boolean, which is a real filter value", () => {
    expect(toQuery({ include_cancelled: false })).toBe("?include_cancelled=false");
  });

  it("returns an empty string when nothing is set", () => {
    expect(toQuery({})).toBe("");
  });
});

describe("catalog.sections", () => {
  it("requests the sections path with the filters applied", async () => {
    const fetchMock = stubFetch({ data: [], meta: { page: 1 } });

    await catalog.sections({ term_uid: 202710, free_days: ["friday"] });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/catalog/sections?");
    expect(url).toContain("term_uid=202710");
    expect(url).toContain("free_days=friday");
  });
});

describe("error handling", () => {
  it("keeps the filter message and code the API reported", async () => {
    stubFetch(
      { error: 'Unknown day "funday"', code: "INVALID_FILTER" },
      { ok: false, status: 400 },
    );

    await expect(catalog.sections({ q: "x" })).rejects.toMatchObject({
      message: 'Unknown day "funday"',
      status: 400,
      code: "INVALID_FILTER",
    });
  });

  it("still reports the status when the body is not json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.reject(new Error("not json")),
    });
    vi.stubGlobal("fetch", fetchMock);

    const error = await catalog.terms().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).code).toBe("UNKNOWN");
  });
});
