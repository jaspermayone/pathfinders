import type { Section } from "../api/types";

/** Schedule types that count as a lab for pairing. */
const LAB_TYPES = new Set(["laboratory"]);

export function isLab(section: Section): boolean {
  return LAB_TYPES.has(section.schedule_type ?? "");
}

/**
 * The link group a section belongs to, or null when it has none.
 *
 * WIT numbers linked sections `<number><LETTER>`, and the trailing letter is
 * the link. CHEM 1000 runs lecture 1A with labs 2A and 3A, then lecture 4B with
 * labs 5B and 6B. Banner publishes a real linkIdentifier, but the importer does
 * not keep it, so the letter is what there is.
 *
 * Checked against Fall 2026: 250 letter groups, 239 hold a lecture and at least
 * one lab, and not one holds labs alone.
 */
export function linkGroup(sectionNumber: string): string | null {
  const match = /^\d+([A-Z])$/.exec(sectionNumber.trim());
  return match ? match[1] : null;
}

/** Identifies the course a section belongs to, across a single term. */
export function courseKey(section: Section): string {
  return `${section.term.uid}|${section.subject}|${section.course_number}`;
}

/**
 * Sections that must be taken together with the given one.
 *
 * Where a letter group exists it decides the pairing. Where it does not, the
 * whole course is the group: 36 courses in Fall 2026 number their sections
 * plainly, and there the only honest answer is every lab of that course.
 */
export function companions(section: Section, pool: Section[]): Section[] {
  const key = courseKey(section);
  const group = linkGroup(section.section_number);

  return pool.filter((other) => {
    if (other.crn === section.crn) return false;
    if (courseKey(other) !== key) return false;
    return linkGroup(other.section_number) === group;
  });
}

/** Labs that pair with a section. Empty when the section is itself a lab. */
export function pairedLabs(section: Section, pool: Section[]): Section[] {
  if (isLab(section)) return [];
  return companions(section, pool).filter(isLab);
}

/** Non-lab sections that a lab pairs with. Empty when the section is not a lab. */
export function pairedLectures(section: Section, pool: Section[]): Section[] {
  if (!isLab(section)) return [];
  return companions(section, pool).filter((other) => !isLab(other));
}
