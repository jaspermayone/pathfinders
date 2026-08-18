import type { Instructor } from "../api/types";
import { hasRmpData } from "../lib/rmp";
import { StarRating } from "./StarRating";

/** Rate My Professors score, shown only when real ratings exist. */
export function RmpBadge({ instructor }: { instructor: Instructor }) {
  const rmp = instructor.rmp;
  if (!hasRmpData(instructor) || !rmp) return null;

  return (
    <span className="flex items-center gap-1">
      <StarRating value={rmp.avg_rating} className="text-sm" />
      <span className="text-xs tabular-nums text-slate-500">
        {rmp.avg_rating.toFixed(1)} ({rmp.num_ratings})
      </span>
    </span>
  );
}
