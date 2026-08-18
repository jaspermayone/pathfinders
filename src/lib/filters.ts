import type { Day } from "../api/types";

/** The filter state the panel edits, before it becomes an API query. */
export interface Filters {
  termUid: number | undefined;
  q: string;
  subjects: string[];
  freeDays: Day[];
  beginsAfter: string;
  endsBefore: string;
  instructor: string;
  /** Lowest Rate My Professors average to accept. 0 turns the filter off. */
  minRating: number;
}

export const EMPTY_FILTERS: Filters = {
  termUid: undefined,
  q: "",
  subjects: [],
  freeDays: [],
  beginsAfter: "",
  endsBefore: "",
  instructor: "",
  minRating: 0,
};
