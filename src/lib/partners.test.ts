import { describe, expect, it } from "vitest";
import type { LinkedSections, Section } from "../api/types";
import { batchCrns, indexByCrn, missingPartnerCrns, partnersOf } from "./partners";

function section(crn: number, linked?: LinkedSections): Section {
  return {
    crn,
    pub_id: `pub-${crn}`,
    term: { uid: 202710, name: "Fall 2026" },
    subject: "Chemistry (CHEM)",
    subject_code: "CHEM",
    course_number: "1000",
    section_number: "1A",
    course_code: "CHEM 1000-1A",
    title: "General Chemistry",
    schedule_type: "lecture",
    schedule_type_code: "LEC",
    credit_hours: 4,
    grade_mode: null,
    status: "active",
    seats: { capacity: 24, available: 6 },
    linked,
    start_date: "2026-09-08",
    end_date: "2026-12-15",
    instructors: [],
    meeting_times: [],
    final_exam: null,
  };
}

const LECTURE = section(1, { required: true, identifier: "A1", crns: [2, 3] });
const LAB = section(2, { required: true, identifier: "B1", crns: [1] });

describe("missingPartnerCrns", () => {
  it("asks only for the partners the page does not already hold", () => {
    expect(missingPartnerCrns([LECTURE, LAB])).toEqual([3]);
  });

  it("asks for a CRN once when two sections share it", () => {
    expect(missingPartnerCrns([LAB, section(4, { required: true, identifier: "B1", crns: [1] })]))
      .toEqual([1]);
  });

  it("asks for nothing when no section is paired", () => {
    expect(missingPartnerCrns([section(7)])).toEqual([]);
  });
});

describe("batchCrns", () => {
  it("keeps a short list in one batch", () => {
    expect(batchCrns([1, 2, 3], 50)).toEqual([[1, 2, 3]]);
  });

  it("splits a long list", () => {
    expect(batchCrns([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns no batch for an empty list", () => {
    expect(batchCrns([])).toEqual([]);
  });
});

describe("indexByCrn", () => {
  it("merges the page and the fetched partners", () => {
    const byCrn = indexByCrn([LECTURE], [LAB]);

    expect([...byCrn.keys()].sort()).toEqual([1, 2]);
  });
});

describe("partnersOf", () => {
  it("returns the partners it can resolve and drops the rest", () => {
    expect(partnersOf(LECTURE, indexByCrn([LECTURE, LAB]))).toEqual([LAB]);
  });

  it("returns nothing for an unpaired section", () => {
    expect(partnersOf(section(7), indexByCrn([LECTURE, LAB]))).toEqual([]);
  });
});
