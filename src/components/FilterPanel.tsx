import type { Day, Subject, Term } from "../api/types";
import { WEEKDAYS } from "../api/types";
import { EMPTY_FILTERS, type Filters } from "../lib/filters";

interface Props {
  filters: Filters;
  terms: Term[];
  subjects: Subject[];
  onChange: (next: Filters) => void;
}

const DAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
};

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm " +
  "focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900";

export function FilterPanel({ filters, terms, subjects, onChange }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleFreeDay = (day: Day) =>
    set(
      "freeDays",
      filters.freeDays.includes(day)
        ? filters.freeDays.filter((d) => d !== day)
        : [...filters.freeDays, day],
    );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="term" className="mb-1 block text-xs font-medium text-slate-500">
          Term
        </label>
        <select
          id="term"
          className={fieldClass}
          value={filters.termUid ?? ""}
          disabled={terms.length === 0}
          onChange={(event) => set("termUid", Number(event.target.value))}
        >
          {/* No "all terms" choice. A plan belongs to one term, and a clash
              between two terms is not a clash. */}
          {terms.length === 0 && <option value="">Loading terms…</option>}
          {terms.map((term) => (
            <option key={term.uid} value={term.uid}>
              {term.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-500">
          Search
        </label>
        <input
          id="q"
          className={fieldClass}
          placeholder="Title, subject, or number"
          value={filters.q}
          onChange={(event) => set("q", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="instructor" className="mb-1 block text-xs font-medium text-slate-500">
          Instructor
        </label>
        <input
          id="instructor"
          className={fieldClass}
          placeholder="Last name"
          value={filters.instructor}
          onChange={(event) => set("instructor", event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="minRating" className="mb-1 block text-xs font-medium text-slate-500">
          Lowest professor rating
        </label>
        <select
          id="minRating"
          className={fieldClass}
          value={filters.minRating}
          onChange={(event) => set("minRating", Number(event.target.value))}
        >
          <option value={0}>Any rating</option>
          <option value={3}>3.0 ★ and up</option>
          <option value={3.5}>3.5 ★ and up</option>
          <option value={4}>4.0 ★ and up</option>
          <option value={4.5}>4.5 ★ and up</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Keeps a section if one of its instructors reaches the rating. Sections
          with no rated instructor are dropped.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-medium text-slate-500">Keep these days free</legend>
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((day) => {
            const on = filters.freeDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => toggleFreeDay(day)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                  on
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {DAY_LABEL[day]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Drops a section if any of its meetings falls on a chosen day.
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="after" className="mb-1 block text-xs font-medium text-slate-500">
            Starts no earlier than
          </label>
          <input
            id="after"
            type="time"
            className={fieldClass}
            value={filters.beginsAfter}
            onChange={(event) => set("beginsAfter", event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="before" className="mb-1 block text-xs font-medium text-slate-500">
            Ends no later than
          </label>
          <input
            id="before"
            type="time"
            className={fieldClass}
            value={filters.endsBefore}
            onChange={(event) => set("endsBefore", event.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-1 block text-xs font-medium text-slate-500">
          Subjects
        </label>
        <select
          id="subject"
          multiple
          size={8}
          className={`${fieldClass} h-auto`}
          value={filters.subjects}
          onChange={(event) =>
            set(
              "subjects",
              Array.from(event.target.selectedOptions, (option) => option.value),
            )
          }
        >
          {subjects.map((subject) => (
            <option key={subject.subject} value={subject.code}>
              {subject.code} · {subject.section_count}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...EMPTY_FILTERS, termUid: filters.termUid })}
        className="text-xs font-medium text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
      >
        Clear filters
      </button>
    </div>
  );
}
