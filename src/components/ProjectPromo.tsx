/** Where the catalog data comes from, and what else the project does. */
export const PROJECT_URL = "https://calendar.witcc.dev";

/**
 * Pathfinders only plans a schedule. The WIT Coding Club calendar project is
 * what carries the schedule into Google Calendar once the student registers,
 * so the two belong next to each other.
 */
export function ProjectPromo({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-labelledby="promo-heading"
      className={`rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40 ${className}`}
    >
      <h2
        id="promo-heading"
        className="font-semibold text-amber-900 dark:text-amber-200"
      >
        Registered already?
      </h2>
      <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
        WIT Calendar puts your classes on Google Calendar and keeps them
        correct all term. It is free, and it is by the same club that built
        this page.
      </p>
      <a
        href={PROJECT_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
      >
        Get WIT Calendar →
      </a>
    </aside>
  );
}
