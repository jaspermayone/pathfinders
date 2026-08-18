import type { Section } from "../api/types";

/**
 * Seat counts come from Banner and a nightly job refreshes them, so they are up
 * to a day old. The label says so, because a student who reads "2 seats left"
 * as live data will make a bad decision with it.
 */
export function SeatBar({ seats }: { seats: Section["seats"] }) {
  const { capacity, available } = seats;

  if (capacity === null || available === null) {
    return <span className="text-xs text-slate-500">Seat count not reported</span>;
  }

  const taken = Math.max(0, capacity - available);
  const fraction = capacity === 0 ? 1 : Math.min(1, taken / capacity);
  const full = available <= 0;

  return (
    <div className="flex items-center gap-2" title="Refreshed nightly, not a live count">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={full ? "h-full bg-rose-500" : "h-full bg-emerald-500"}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
        {full ? "Full" : `${available} of ${capacity} open`}
        <span className="text-slate-400 dark:text-slate-500"> · as of last night</span>
      </span>
    </div>
  );
}
