import { useMemo, useState } from "react";
import { catalog, type SectionFilters } from "./api/client";
import type { Section } from "./api/types";
import { FilterPanel } from "./components/FilterPanel";
import { EMPTY_FILTERS, type Filters } from "./lib/filters";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { ProjectPromo, PROJECT_URL } from "./components/ProjectPromo";
import { SectionCard } from "./components/SectionCard";
import { useAsync, useDebounced, useStoredState } from "./lib/hooks";
import { conflictingCrns, findConflicts, totalCredits } from "./lib/schedule";
import { meetsMinRating } from "./lib/rmp";
import {
  leadSections,
  sectionKey,
  soloPartnerCrn,
  unpairedSections,
} from "./lib/linked";
import { batchCrns, indexByCrn, missingPartnerCrns, partnersOf } from "./lib/partners";
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
  // A lab the student took out must not come back the next time the lecture is
  // added, so every removal is remembered.
  const [declined, setDeclined] = useStoredState<string[]>(
    "pathfinders.declinedPartners",
    [],
  );

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

  // The catalog API has no rating filter yet, so this one runs here, over the
  // page already loaded. The count below says so, rather than reporting a
  // server total that the filter did not touch.
  const shownSections = useMemo(() => {
    const all = sections.data?.data ?? [];
    return debounced.minRating > 0
      ? all.filter((section) => meetsMinRating(section.instructors, debounced.minRating))
      : all;
  }, [sections.data, debounced.minRating]);

  // A lecture usually pairs with a lab on another page, so the partners the
  // page does not hold are fetched once for the whole page, not once per card.
  const wantedCrns = useMemo(
    () => missingPartnerCrns(shownSections),
    [shownSections],
  );

  const partners = useAsync<Section[]>(
    (signal) =>
      wantedCrns.length === 0
        ? Promise.resolve([])
        : Promise.all(
            batchCrns(wantedCrns).map((crns) =>
              catalog
                .sections({ term_uid: termUid, crn: crns, per_page: crns.length }, signal)
                .then((r) => r.data),
            ),
          ).then((groups) => groups.flat()),
    [wantedCrns.join(","), termUid],
  );

  const byCrn = useMemo(
    () => indexByCrn(shownSections, plan, partners.data ?? []),
    [shownSections, plan, partners.data],
  );

  // A lab on this page is shown inside the card of its lecture, so it is not
  // repeated as a card of its own.
  const leads = useMemo(() => leadSections(shownSections), [shownSections]);

  const planCrns = useMemo(() => new Set(plan.map((s) => s.crn)), [plan]);
  const unpaired = useMemo(() => unpairedSections(plan), [plan]);
  const clashing = useMemo(() => conflictingCrns(plan), [plan]);
  const conflicts = useMemo(() => findConflicts(plan), [plan]);

  const togglePlan = (section: Section) => {
    const key = sectionKey(section.term.uid, section.crn);

    if (plan.some((s) => s.crn === section.crn)) {
      setDeclined((previous) =>
        previous.includes(key) ? previous : [...previous, key],
      );
      setPlan((previous) => previous.filter((s) => s.crn !== section.crn));
      return;
    }

    // Adding a section back is a decision to keep it.
    setDeclined((previous) => previous.filter((k) => k !== key));

    setPlan((previous) => {
      // The pair gives a section two Add buttons, one on the lecture card and
      // one on the partner row, so the same section can arrive twice.
      if (previous.some((s) => s.crn === section.crn)) return previous;

      const next = [...previous, section];

      // Only one candidate means there is no choice to make, so take it. A
      // lecture with several labs is left to the student.
      const partnerCrn = soloPartnerCrn(section);
      const partner = partnerCrn === null ? undefined : byCrn.get(partnerCrn);
      const partnerKey = partner && sectionKey(partner.term.uid, partner.crn);

      if (
        partner &&
        partnerKey &&
        !declined.includes(partnerKey) &&
        !next.some((s) => s.crn === partner.crn)
      ) {
        next.push(partner);
      }

      return next;
    });
  };

  const onFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  const meta = sections.data?.meta;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white lg:shrink-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
          <h1 className="text-lg font-semibold">Pathfinders</h1>
          <p className="text-sm text-slate-500">
            Build a WIT schedule before you register.
          </p>
        </div>
      </header>

      {/* On a wide screen each column scrolls on its own, so the filters and
          the plan stay in place while the section list moves. */}
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[16rem_1fr_22rem]">
        <aside className="lg:h-full lg:overflow-y-auto lg:pr-1">
          <FilterPanel
            filters={{ ...filters, termUid }}
            terms={offeredTerms}
            subjects={subjects.data ?? []}
            onChange={onFiltersChange}
          />
        </aside>

        <section aria-label="Sections" className="lg:h-full lg:overflow-y-auto lg:pr-1">
          <div className="mb-3 flex items-baseline justify-between gap-2 lg:sticky lg:top-0 lg:z-10 lg:bg-slate-50 lg:py-1 dark:lg:bg-slate-950">
            <h2 className="text-sm font-medium text-slate-500">
              {sections.loading
                ? "Searching…"
                : !meta
                  ? "Sections"
                  : debounced.minRating > 0
                    ? `${shownSections.length} of ${sections.data?.data.length ?? 0} on this page`
                    : `${meta.total_count.toLocaleString()} sections`}
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

          {!sections.error && sections.data && shownSections.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No section matches these filters. Try clearing a free day, a time
              limit, or the rating.
            </p>
          )}

          <div className="space-y-2">
            {leads.map((section) => (
              <SectionCard
                key={`${section.term.uid}-${section.crn}`}
                section={section}
                inPlan={planCrns.has(section.crn)}
                conflicting={clashing.has(section.crn) && planCrns.has(section.crn)}
                onToggle={togglePlan}
                partners={partnersOf(section, byCrn)}
                plannedCrns={planCrns}
              />
            ))}
          </div>
        </section>

        <aside className="lg:h-full lg:overflow-y-auto lg:pr-1">
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

                {unpaired.length > 0 && (
                  <div
                    role="alert"
                    className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  >
                    <p className="font-medium">
                      {unpaired.length === 1
                        ? "One section still needs its partner:"
                        : `${unpaired.length} sections still need a partner:`}
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {unpaired.map((section) => (
                        <li key={`${section.term.uid}-${section.crn}`}>
                          {section.course_code} needs CRN{" "}
                          {section.linked?.crns.join(" or ")}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1">
                      LeopardWeb rejects the registration if you leave one out.
                    </p>
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

          <ProjectPromo className="mt-4" />
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl space-y-1 px-4 pb-8 text-xs text-slate-500">
        <p>
          Course data from the{" "}
          <a
            href={PROJECT_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300"
          >
            WIT Calendar
          </a>{" "}
          public catalog API. Seat counts are refreshed nightly and are not
          live. Always confirm in LeopardWeb before you register.
        </p>
        <p>
          WIT Calendar is a WIT Coding Club project. It syncs your class
          schedule to Google Calendar for free.
        </p>
      </footer>
    </div>
  );
}
