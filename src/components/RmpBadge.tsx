import type { Instructor } from "../api/types";

/** Rate My Professors score, shown only when real ratings exist. */
export function RmpBadge({ instructor }: { instructor: Instructor }) {
  const rmp = instructor.rmp;
  if (!rmp) return null;

  const tone =
    rmp.avg_rating >= 4
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : rmp.avg_rating >= 3
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}
      title={`${rmp.num_ratings} ratings · difficulty ${rmp.avg_difficulty.toFixed(1)}${
        rmp.would_take_again_percent === null
          ? ""
          : ` · ${Math.round(rmp.would_take_again_percent)}% would take again`
      }`}
    >
      {rmp.avg_rating.toFixed(1)} ★
    </span>
  );
}
