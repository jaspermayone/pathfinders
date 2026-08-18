// Mirrors the payload of the WIT public catalog API. Keep these in step with
// app/serializers/catalog/*.rb in the calendar-backend repo.

export type Day =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export const DAYS: Day[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** The days a class can actually meet. Sunday is never used in practice. */
export const WEEKDAYS: Day[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export interface Term {
  uid: number;
  name: string;
  season: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  /** Only present on the subjects-style responses that count sections. */
  section_count?: number;
}

export interface Subject {
  subject: string;
  code: string;
  section_count: number;
}

export interface Rmp {
  id: string | null;
  avg_rating: number;
  avg_difficulty: number;
  num_ratings: number;
  /** Null when Rate My Professors has no would-take-again data. */
  would_take_again_percent: number | null;
}

export interface Instructor {
  pub_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  school: string | null;
  /** Null when the instructor has no ratings at all. */
  rmp: Rmp | null;
}

export interface Location {
  /** Null when the room is a placeholder "TBD" record. */
  display: string | null;
  building: { abbreviation: string; name: string };
  rooms: { number: string; floor: string | null }[];
}

export interface MeetingTime {
  day: Day;
  day_of_week: number;
  /** "HH:MM", 24 hour. */
  begin_time: string;
  end_time: string;
  begin_time_12h: string;
  end_time_12h: string;
  duration_minutes: number;
  meeting_type: string | null;
  all_day: boolean;
  /** Null when the section has no room, as with online sections. */
  location: Location | null;
}

export interface FinalExam {
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
}

export interface LinkedSections {
  /** True when Banner marks this section as part of a pairing. */
  required: boolean;
  /** Banner's identifier, e.g. "A1" for a lecture and "B1" for its labs. */
  identifier: string | null;
  /** CRNs of the partner sections in the same term. */
  crns: number[];
  /** Public ids of the same partners, in the same order. Older builds omit it. */
  pub_ids?: string[];
}

export interface Section {
  crn: number;
  pub_id: string;
  term: { uid: number; name: string };
  subject: string;
  subject_code: string;
  course_number: string;
  section_number: string;
  course_code: string;
  title: string;
  schedule_type: string | null;
  schedule_type_code: string | null;
  credit_hours: number | null;
  grade_mode: string | null;
  status: string;
  /**
   * From Banner, refreshed nightly. Up to a day old, so never present this as a
   * real-time seat count. Either field is null when Banner sent no enrollment
   * data for the CRN.
   */
  seats: { capacity: number | null; available: number | null };
  /**
   * Sections Banner makes a student register together, most often a lecture and
   * its lab. Optional because older API builds do not send it.
   */
  linked?: LinkedSections;
  start_date: string | null;
  end_date: string | null;
  instructors: Instructor[];
  meeting_times: MeetingTime[];
  final_exam: FinalExam | null;
}

export interface Meta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface Collection<T> {
  data: T[];
  meta: Meta;
}

/** The API answers a bad filter with this shape and HTTP 400. */
export interface ApiErrorBody {
  error: string;
  code: "INVALID_FILTER" | "NOT_FOUND";
}
