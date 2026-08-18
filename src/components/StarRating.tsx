/**
 * Five stars with a fractional fill.
 *
 * Two copies of the same row sit on top of each other. The filled copy is
 * clipped to a percentage of the width, so a 3.7 shows as three and two thirds
 * stars without any half-star artwork.
 */
export function StarRating({
  value,
  className = "text-base",
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.min(5, Math.max(0, value));
  const percent = (clamped / 5) * 100;

  return (
    <span
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5`}
      className={`relative inline-block whitespace-nowrap leading-none ${className}`}
    >
      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
        ★★★★★
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden text-amber-500"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
