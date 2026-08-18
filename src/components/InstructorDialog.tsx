import { useEffect, useRef } from "react";
import type { Instructor } from "../api/types";
import { rmpUrl } from "../lib/rmp";
import { StarRating } from "./StarRating";

interface Props {
  instructor: Instructor;
  onClose: () => void;
}

/** One labelled number in the ratings breakdown. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Details for one instructor, with their Rate My Professors scores. */
export function InstructorDialog({ instructor, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const rmp = instructor.rmp;
  const url = rmpUrl(rmp?.id ?? null);

  // Escape closes the popup, and focus starts inside it, so a keyboard user is
  // never left tabbing through the page behind.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const subtitle = [instructor.title, instructor.department, instructor.school]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={instructor.name}
        // The backdrop closes the popup. Without this the same click passes
        // through the panel and closes it as soon as it opens.
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {instructor.name}
            </h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {rmp && rmp.num_ratings > 0 ? (
          <>
            <div className="mt-3 flex items-center gap-2">
              <StarRating value={rmp.avg_rating} className="text-xl" />
              <span className="text-lg font-semibold tabular-nums">
                {rmp.avg_rating.toFixed(1)}
              </span>
              <span className="text-sm text-slate-500">
                {rmp.num_ratings} {rmp.num_ratings === 1 ? "rating" : "ratings"}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Difficulty" value={`${rmp.avg_difficulty.toFixed(1)} / 5`} />
              <Stat
                label="Would take again"
                value={
                  rmp.would_take_again_percent === null
                    ? "No data"
                    : `${Math.round(rmp.would_take_again_percent)}%`
                }
              />
            </dl>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No Rate My Professors ratings for this instructor.
          </p>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 block rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Open on Rate My Professors ↗
          </a>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Ratings come from Rate My Professors. They are opinions from students,
          not an official measure.
        </p>
      </div>
    </div>
  );
}
