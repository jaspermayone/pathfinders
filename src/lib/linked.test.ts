import { describe, expect, it } from "vitest";
import type { Section } from "../api/types";
import {
  companions,
  courseKey,
  isLab,
  linkGroup,
  pairedLabs,
  pairedLectures,
} from "./linked";

function section(
  crn: number,
  sectionNumber: string,
  scheduleType: string,
  overrides: Partial<Section> = {},
): Section {
  return {
    crn,
    pub_id: `crs_${crn}`,
    term: { uid: 202710, name: "Fall 2026" },
    subject: "Chemistry (CHEM)",
    subject_code: "CHEM",
    course_number: "1000",
    section_number: sectionNumber,
    course_code: `CHEM 1000-${sectionNumber}`,
    title: "General Chemistry",
    schedule_type: scheduleType,
    schedule_type_code: null,
    credit_hours: 3,
    grade_mode: null,
    status: "active",
    seats: { capacity: 24, available: 4 },
    start_date: null,
    end_date: null,
    instructors: [],
    meeting_times: [],
    final_exam: null,
    ...overrides,
  } as Section;
}

// CHEM 1000 as the registrar publishes it: two letter groups, each a lecture
// with two labs.
const CHEM = [
  section(16861, "1A", "lecture"),
  section(16862, "2A", "laboratory"),
  section(16863, "3A", "laboratory"),
  section(16864, "4B", "lecture"),
  section(16865, "5B", "laboratory"),
  section(16866, "6B", "laboratory"),
];

describe("linkGroup", () => {
  it("reads the trailing letter as the group", () => {
    expect(linkGroup("13D")).toBe("D");
  });

  it("has no group for a plain number", () => {
    expect(linkGroup("7")).toBeNull();
  });

  it("has no group for a prefixed number like X06", () => {
    expect(linkGroup("X06")).toBeNull();
  });

  it("ignores surrounding spaces", () => {
    expect(linkGroup(" 2A ")).toBe("A");
  });
});

describe("isLab", () => {
  it("recognises a laboratory", () => {
    expect(isLab(section(1, "2A", "laboratory"))).toBe(true);
  });

  it("does not treat a lecture as a lab", () => {
    expect(isLab(section(1, "1A", "lecture"))).toBe(false);
  });

  it("does not trip over a missing schedule type", () => {
    expect(isLab(section(1, "1A", "lecture", { schedule_type: null }))).toBe(false);
  });
});

describe("courseKey", () => {
  it("separates the same course number in different subjects", () => {
    expect(courseKey(section(1, "1A", "lecture"))).not.toBe(
      courseKey(section(2, "1A", "lecture", { subject: "Physics (PHYS)" })),
    );
  });

  it("separates the same course in different terms", () => {
    expect(courseKey(section(1, "1A", "lecture"))).not.toBe(
      courseKey(
        section(2, "1A", "lecture", { term: { uid: 202610, name: "Fall 2025" } }),
      ),
    );
  });
});

describe("companions", () => {
  it("keeps only the sections sharing the letter group", () => {
    const found = companions(CHEM[0], CHEM).map((s) => s.section_number);
    expect(found).toEqual(["2A", "3A"]);
  });

  it("never returns the section itself", () => {
    expect(companions(CHEM[1], CHEM).map((s) => s.crn)).not.toContain(16862);
  });

  it("ignores sections of another course", () => {
    const other = section(99, "2A", "laboratory", {
      subject: "Physics (PHYS)",
      course_number: "1100",
    });
    expect(companions(CHEM[0], [...CHEM, other])).toHaveLength(2);
  });

  it("groups plainly numbered sections by the whole course", () => {
    const plain = [
      section(16769, "1", "lecture", { subject: "Manufacturing (MANF)", course_number: "3200" }),
      section(16770, "2", "laboratory", { subject: "Manufacturing (MANF)", course_number: "3200" }),
      section(16771, "3", "laboratory", { subject: "Manufacturing (MANF)", course_number: "3200" }),
    ];
    expect(companions(plain[0], plain).map((s) => s.crn)).toEqual([16770, 16771]);
  });

  it("does not pair a lettered section with a plainly numbered one", () => {
    const stray = section(17214, "X06", "laboratory");
    expect(companions(CHEM[0], [...CHEM, stray])).toHaveLength(2);
  });
});

describe("pairedLabs and pairedLectures", () => {
  it("gives a lecture its labs", () => {
    expect(pairedLabs(CHEM[0], CHEM).map((s) => s.section_number)).toEqual(["2A", "3A"]);
  });

  it("gives a lab its lecture", () => {
    expect(pairedLectures(CHEM[1], CHEM).map((s) => s.section_number)).toEqual(["1A"]);
  });

  it("asks no lab of a lab", () => {
    expect(pairedLabs(CHEM[1], CHEM)).toEqual([]);
  });

  it("asks no lecture of a lecture", () => {
    expect(pairedLectures(CHEM[0], CHEM)).toEqual([]);
  });

  it("returns nothing when the course has no lab", () => {
    const lectureOnly = [
      section(1, "1A", "lecture"),
      section(2, "2A", "lecture"),
    ];
    expect(pairedLabs(lectureOnly[0], lectureOnly)).toEqual([]);
  });
});
