import { describe, expect, it } from "vitest";
import type { Term } from "../api/types";
import { defaultTermUid, selectableTerms } from "./terms";

const term = (uid: number, name: string, section_count: number): Term => ({
  uid,
  name,
  season: name.split(" ")[0].toLowerCase(),
  year: Number(name.split(" ")[1]),
  start_date: null,
  end_date: null,
  section_count,
});

const CATALOG: Term[] = [
  term(202910, "Fall 2028", 0),
  term(202810, "Fall 2027", 0),
  term(202710, "Fall 2026", 1323),
  term(202630, "Summer 2026", 584),
  term(202620, "Spring 2026", 1219),
  term(201310, "Fall 2012", 0),
];

describe("selectableTerms", () => {
  it("drops terms with no sections", () => {
    expect(selectableTerms(CATALOG).map((t) => t.name)).toEqual([
      "Fall 2026",
      "Summer 2026",
      "Spring 2026",
    ]);
  });

  it("drops future terms the registrar defined but never filled", () => {
    expect(selectableTerms(CATALOG).some((t) => t.year >= 2027)).toBe(false);
  });

  it("drops terms too far back to matter", () => {
    expect(selectableTerms(CATALOG).some((t) => t.uid === 201310)).toBe(false);
  });

  it("orders newest first", () => {
    const uids = selectableTerms(CATALOG).map((t) => t.uid);
    expect(uids).toEqual([...uids].sort((a, b) => b - a));
  });

  it("returns nothing when no term holds sections", () => {
    expect(selectableTerms([term(202910, "Fall 2028", 0)])).toEqual([]);
  });

  it("drops a term whose count is missing entirely", () => {
    const noCount = { ...term(202710, "Fall 2026", 0) };
    delete (noCount as { section_count?: number }).section_count;
    expect(selectableTerms([noCount])).toEqual([]);
  });
});

describe("defaultTermUid", () => {
  it("picks the newest term that has sections", () => {
    expect(defaultTermUid(CATALOG)).toBe(202710);
  });

  it("is undefined when nothing is selectable", () => {
    expect(defaultTermUid([])).toBeUndefined();
  });
});
