import type { Day, MeetingTime, Section } from "../api/types";
import { bundleKey } from "./linked";

/** "09:45" -> 585. The API sends 24 hour "HH:MM". */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Two meetings clash when they share a day and their times overlap. Touching
 * ends do not clash: a class that ends at 10:00 leaves the room for one that
 * starts at 10:00.
 */
export function meetingsOverlap(a: MeetingTime, b: MeetingTime): boolean {
  if (a.day !== b.day) return false;
  if (a.all_day || b.all_day) return true;
  return (
    toMinutes(a.begin_time) < toMinutes(b.end_time) &&
    toMinutes(b.begin_time) < toMinutes(a.end_time)
  );
}

export interface Conflict {
  a: Section;
  b: Section;
  day: Day;
}

/**
 * Every clashing pair in a set of sections. Sections in different terms cannot
 * clash, so they are never compared.
 */
export function findConflicts(sections: Section[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const a = sections[i];
      const b = sections[j];
      if (a.term.uid !== b.term.uid) continue;

      for (const meetingA of a.meeting_times) {
        for (const meetingB of b.meeting_times) {
          if (meetingsOverlap(meetingA, meetingB)) {
            conflicts.push({ a, b, day: meetingA.day });
          }
        }
      }
    }
  }

  return conflicts;
}

/** The CRNs involved in at least one clash, for highlighting in the list. */
export function conflictingCrns(sections: Section[]): Set<number> {
  const crns = new Set<number>();
  for (const conflict of findConflicts(sections)) {
    crns.add(conflict.a.crn);
    crns.add(conflict.b.crn);
  }
  return crns;
}

export function totalCredits(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + (s.credit_hours ?? 0), 0);
}

export interface PlacedMeeting {
  section: Section;
  meeting: MeetingTime;
}

/** Meetings grouped by day, each list sorted by start time. */
export function meetingsByDay(sections: Section[]): Map<Day, PlacedMeeting[]> {
  const byDay = new Map<Day, PlacedMeeting[]>();

  for (const section of sections) {
    for (const meeting of section.meeting_times) {
      const list = byDay.get(meeting.day) ?? [];
      list.push({ section, meeting });
      byDay.set(meeting.day, list);
    }
  }

  for (const list of byDay.values()) {
    list.sort((x, y) => toMinutes(x.meeting.begin_time) - toMinutes(y.meeting.begin_time));
  }

  return byDay;
}

/**
 * The hour range the grid must cover. Falls back to 8:00-18:00 when nothing is
 * placed yet, so an empty grid still looks like a week.
 */
export function gridBounds(sections: Section[]): { start: number; end: number } {
  const meetings = sections.flatMap((s) => s.meeting_times).filter((m) => !m.all_day);
  if (meetings.length === 0) return { start: 8 * 60, end: 18 * 60 };

  const earliest = Math.min(...meetings.map((m) => toMinutes(m.begin_time)));
  const latest = Math.max(...meetings.map((m) => toMinutes(m.end_time)));

  return {
    start: Math.floor(earliest / 60) * 60,
    end: Math.ceil(latest / 60) * 60,
  };
}

/**
 * The sections the week view cannot place. An online section has no meeting
 * time, so it would leave the plan without a trace of it.
 */
export function unscheduledSections(sections: Section[]): Section[] {
  return sections.filter(
    (section) => section.meeting_times.filter((m) => !m.all_day).length === 0,
  );
}

/** The tallest the week view may be, in pixels. */
export const GRID_MAX_HEIGHT = 340;

/** The shortest a minute may be drawn, so a long day stays readable. */
const MIN_PIXELS_PER_MINUTE = 0.36;

/** The tallest a minute is drawn, so a short day does not stretch. */
const MAX_PIXELS_PER_MINUTE = 0.9;

/**
 * The pixels per minute the week view uses. A plan that spans 08:00 to 21:00
 * is drawn tighter than one that spans 08:00 to 12:00, so the whole week stays
 * on screen instead of pushing the page into a long scroll.
 */
export function gridScale(start: number, end: number): number {
  const minutes = Math.max(1, end - start);
  const fitted = GRID_MAX_HEIGHT / minutes;

  return Math.min(MAX_PIXELS_PER_MINUTE, Math.max(MIN_PIXELS_PER_MINUTE, fitted));
}

/** A short hour label, for example "8" or "12p", for a narrow time column. */
export function hourLabel(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const clock = hour % 12 === 0 ? 12 : hour % 12;

  return hour === 12 ? "12p" : String(clock);
}

/**
 * A stable colour per course, so the grid and the list agree. A lecture and
 * its lab share the colour, because a student registers them as one course.
 */
export function sectionHue(section: Section): number {
  const key = bundleKey(section);
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 360;
  }

  return hash;
}
