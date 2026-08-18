import { describe, expect, it } from "vitest";
import type { MeetingTime, Section } from "../api/types";
import {
  conflictingCrns,
  findConflicts,
  fromMinutes,
  gridBounds,
  meetingsByDay,
  meetingsOverlap,
  toMinutes,
  totalCredits,
} from "./schedule";

function meeting(
  day: MeetingTime["day"],
  begin: string,
  end: string,
  overrides: Partial<MeetingTime> = {},
): MeetingTime {
  return {
    day,
    day_of_week: 1,
    begin_time: begin,
    end_time: end,
    begin_time_12h: begin,
    end_time_12h: end,
    duration_minutes: toMinutes(end) - toMinutes(begin),
    meeting_type: "Class",
    all_day: false,
    location: null,
    ...overrides,
  };
}

function section(
  crn: number,
  meetings: MeetingTime[],
  overrides: Partial<Section> = {},
): Section {
  return {
    crn,
    pub_id: `pub-${crn}`,
    term: { uid: 202710, name: "Fall 2026" },
    subject: "Computer Science (COMP)",
    subject_code: "COMP",
    course_number: "1000",
    section_number: "01",
    course_code: `COMP 1000-0${crn % 10}`,
    title: "Test Course",
    schedule_type: "Lecture",
    schedule_type_code: "LEC",
    credit_hours: 4,
    grade_mode: "Standard",
    status: "active",
    seats: { capacity: 30, available: 5 },
    start_date: null,
    end_date: null,
    instructors: [],
    meeting_times: meetings,
    final_exam: null,
    ...overrides,
  };
}

describe("toMinutes and fromMinutes", () => {
  it("converts a 24 hour time to minutes", () => {
    expect(toMinutes("09:45")).toBe(585);
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("round trips", () => {
    expect(fromMinutes(toMinutes("16:05"))).toBe("16:05");
    expect(fromMinutes(600)).toBe("10:00");
  });
});

describe("meetingsOverlap", () => {
  it("is false on different days", () => {
    expect(
      meetingsOverlap(meeting("monday", "09:00", "10:00"), meeting("tuesday", "09:00", "10:00")),
    ).toBe(false);
  });

  it("is true when the times cross", () => {
    expect(
      meetingsOverlap(meeting("monday", "09:00", "10:15"), meeting("monday", "10:00", "11:00")),
    ).toBe(true);
  });

  it("is false when one ends exactly as the other starts", () => {
    expect(
      meetingsOverlap(meeting("monday", "09:00", "10:00"), meeting("monday", "10:00", "11:00")),
    ).toBe(false);
  });

  it("treats an all day meeting as covering the whole day", () => {
    expect(
      meetingsOverlap(
        meeting("monday", "00:00", "00:00", { all_day: true }),
        meeting("monday", "14:00", "15:00"),
      ),
    ).toBe(true);
  });
});

describe("findConflicts", () => {
  it("finds a clashing pair", () => {
    const a = section(1, [meeting("monday", "09:00", "10:15")]);
    const b = section(2, [meeting("monday", "10:00", "11:00")]);

    const conflicts = findConflicts([a, b]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].day).toBe("monday");
  });

  it("returns nothing when the plan fits", () => {
    const a = section(1, [meeting("monday", "09:00", "10:00")]);
    const b = section(2, [meeting("monday", "10:00", "11:00")]);

    expect(findConflicts([a, b])).toEqual([]);
  });

  it("never clashes sections in different terms", () => {
    const fall = section(1, [meeting("monday", "09:00", "10:15")]);
    const spring = section(2, [meeting("monday", "09:00", "10:15")], {
      term: { uid: 202620, name: "Spring 2026" },
    });

    expect(findConflicts([fall, spring])).toEqual([]);
  });

  it("reports each clashing crn once", () => {
    const a = section(1, [meeting("monday", "09:00", "10:15"), meeting("friday", "09:00", "10:15")]);
    const b = section(2, [meeting("monday", "10:00", "11:00"), meeting("friday", "10:00", "11:00")]);

    expect(findConflicts([a, b])).toHaveLength(2);
    expect([...conflictingCrns([a, b])].sort()).toEqual([1, 2]);
  });
});

describe("totalCredits", () => {
  it("adds credit hours and treats a null as zero", () => {
    const a = section(1, [], { credit_hours: 4 });
    const b = section(2, [], { credit_hours: null });

    expect(totalCredits([a, b])).toBe(4);
  });
});

describe("meetingsByDay", () => {
  it("groups by day and sorts by start time", () => {
    const a = section(1, [meeting("monday", "14:00", "15:00")]);
    const b = section(2, [meeting("monday", "09:00", "10:00")]);

    const monday = meetingsByDay([a, b]).get("monday")!;

    expect(monday.map((entry) => entry.meeting.begin_time)).toEqual(["09:00", "14:00"]);
  });
});

describe("gridBounds", () => {
  it("falls back to a normal day when nothing is placed", () => {
    expect(gridBounds([])).toEqual({ start: 480, end: 1080 });
  });

  it("rounds out to whole hours around the meetings", () => {
    const a = section(1, [meeting("monday", "09:20", "10:35")]);

    expect(gridBounds([a])).toEqual({ start: 540, end: 660 });
  });

  it("ignores all day meetings, which have no real time", () => {
    const a = section(1, [meeting("monday", "00:00", "00:00", { all_day: true })]);

    expect(gridBounds([a])).toEqual({ start: 480, end: 1080 });
  });
});
