import { useMemo, useState } from "react";
import { catalog, type SectionFilters } from "./api/client";
import type { Section } from "./api/types";
import { FilterPanel } from "./components/FilterPanel";
import { EMPTY_FILTERS, type Filters } from "./lib/filters";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { SectionCard } from "./components/SectionCard";
import { useAsync, useDebounced, useStoredState } from "./lib/hooks";
import { conflictingCrns, findConflicts, totalCredits } from "./lib/schedule";
import { defaultTermUid, selectableTerms } from "./lib/terms";

const PER_PAGE = 50;

/** Turns panel state into the query the API expects. */
function toApiFilters(filters: Filters, page: number): SectionFilters {
  return {
    term_uid: filters.termUid,
    q: filters.q || undefined,
    subject: filters.subjects,
    free_days: filters.freeDays,
    begins_after: filters.beginsAfter || undefined,
    ends_before: filters.endsBefore || undefined,
    instructor: filters.instructor || undefined,
    page,
    per_page: PER_PAGE,
  };
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useStoredState<Section[]>("pathfinders.plan", []);

  // Typing in the search box must not fire one request per keystroke.
  const debounced = useDebounced(filters, 300);

  const terms = useAsync((signal) => catalog.terms(signal), []);

  // The catalog lists every term the registrar ever defined. Only offer the
  // ones that actually hold sections.
  const offeredTerms = useMemo(
    () => selectableTerms(terms.data ?? []),
    [terms.data],
  );

  // Default to the newest usable term once the list arrives, so the page is
  // not empty on first load.
  const termUid = debounced.termUid ?? defaultTermUid(terms.data ?? []);

  const subjects = useAsync(
    (signal) => catalog.subjects(termUid, signal),
    [termUid],
  );

  const sections = useAsync(
    (signal) => catalog.sections(toApiFilters({ ...debounced, termUid }, page), signal),
    [JSON.stringify(debounced), termUid, page],
  );

  const planCrns = useMemo(() => new Set(plan.map((s) => s.crn)), [plan]);
  const clashing = useMemo(() => conflictingCrns(plan), [plan]);
  const conflicts = useMemo(() => findConflicts(plan), [plan]);

  const togglePlan = (section: Section) =>
    setPlan((previous) =>
      previous.some((s) => s.crn === section.crn)
        ? previous.filter((s) => s.crn !== section.crn)
        : [...previous, section],
    );

  const onFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  const meta = sections.data?.meta;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
          <h1 className="text-lg font-semibold">Pathfinders</h1>
          <p className="text-sm text-slate-500">
            Build a WIT schedule before you register.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16rem_1fr_22rem]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <FilterPanel
            filters={{ ...filters, termUid }}
            terms={offeredTerms}
            subjects={subjects.data ?? []}
            onChange={onFiltersChange}
          />
        </aside>

        <section aria-label="Sections">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-500">
              {sections.loading
                ? "Searching…"
                : meta
                  ? `${meta.total_count.toLocaleString()} sections`
                  : "Sections"}
            </h2>
            {meta && meta.total_pages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-700"
                >
                  Back
                </button>
                <span className="tabular-nums text-slate-500">
                  {meta.page} / {meta.total_pages}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {sections.error && (
            <div
              role="alert"
              className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
            >
              <p className="font-medium">The catalog request failed.</p>
              <p>{sections.error.message}</p>
              <button
                type="button"
                onClick={sections.reload}
                className="mt-2 rounded border border-rose-400 px-2 py-0.5 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {!sections.error && sections.data?.data.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No section matches these filters. Try clearing a free day or a time limit.
            </p>
          )}

          <div className="space-y-2">
            {sections.data?.data.map((section) => (
              <SectionCard
                key={`${section.term.uid}-${section.crn}`}
                section={section}
                inPlan={planCrns.has(section.crn)}
                conflicting={clashing.has(section.crn) && planCrns.has(section.crn)}
                onToggle={togglePlan}
              />
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-semibold">Your plan</h2>
              <span className="text-sm text-slate-500">
                {plan.length} sections · {totalCredits(plan)} cr
              </span>
            </div>

            {plan.length === 0 ? (
              <p className="text-sm text-slate-500">
                Add a section and it appears on this week view.
              </p>
            ) : (
              <>
                <ScheduleGrid sections={plan} />

                {conflicts.length > 0 && (
                  <div
                    role="alert"
                    className="mt-3 rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
                  >
                    <p className="font-medium">
                      {conflicts.length} time {conflicts.length === 1 ? "clash" : "clashes"}:
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {conflicts.map((conflict, index) => (
                        <li key={index}>
                          {conflict.a.course_code} and {conflict.b.course_code} on{" "}
                          {conflict.day}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ul className="mt-3 space-y-1 text-sm">
                  {plan.map((section) => (
                    <li
                      key={`${section.term.uid}-${section.crn}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        <span className="font-medium">{section.course_code}</span>{" "}
                        <span className="text-slate-500">{section.crn}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePlan(section)}
                        aria-label={`Remove ${section.course_code}`}
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs text-slate-500">
                  Copy these CRNs into LeopardWeb to register. This page does not
                  register you.
                </p>
              </>
            )}
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-500">
        Course data from the WIT Coding Club public catalog API. Seat counts are
        refreshed nightly and are not live. Always confirm in LeopardWeb before
        you register.
      </footer>
    </div>
  );
}
