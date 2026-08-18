import type { Instructor } from "../api/types";

/**
 * The catalog passes through the Rate My Professors relay id, which is base64
 * of `Teacher-<number>`. Their pages are addressed by the bare number, so the
 * id has to be decoded before it can be linked.
 */
export function rmpProfessorId(relayId: string | null): string | null {
  if (!relayId) return null;

  let decoded: string;
  try {
    decoded = atob(relayId);
  } catch {
    // Not base64 at all. Nothing to link to.
    return null;
  }

  const match = /^Teacher-(\d+)$/.exec(decoded);
  return match ? match[1] : null;
}

/** Public profile page, or null when the id cannot be decoded. */
export function rmpUrl(relayId: string | null): string | null {
  const id = rmpProfessorId(relayId);
  return id ? `https://www.ratemyprofessors.com/professor/${id}` : null;
}

/** True when there is anything worth opening a details popup for. */
export function hasRmpData(instructor: Instructor): boolean {
  return instructor.rmp !== null && instructor.rmp.num_ratings > 0;
}

/** The best Rate My Professors average among a section's instructors. */
export function bestRating(instructors: Instructor[]): number | null {
  const rated = instructors
    .filter(hasRmpData)
    .map((instructor) => instructor.rmp!.avg_rating);

  return rated.length === 0 ? null : Math.max(...rated);
}

/**
 * Whether a section passes a minimum-rating filter.
 *
 * A section passes when at least one of its instructors is rated at or above
 * the bar. A section with no rated instructor does not pass, because there is
 * nothing to compare. A bar of 0 turns the filter off.
 */
export function meetsMinRating(instructors: Instructor[], min: number): boolean {
  if (min <= 0) return true;

  const best = bestRating(instructors);
  return best !== null && best >= min;
}
