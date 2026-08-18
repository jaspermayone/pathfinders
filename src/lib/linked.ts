import type { Section } from "../api/types";

/**
 * Banner marks the sections a student has to register together, most often a
 * lecture and its lab. The catalog API passes that marking through as
 * `linked`, so nothing here has to guess the pairing from a section number.
 */

/** CRNs Banner pairs with this section. */
export function partnerCrns(section: Section): number[] {
  return section.linked?.crns ?? [];
}

/** True when the section cannot be registered on its own. */
export function needsPartner(section: Section): boolean {
  return section.linked?.required === true && partnerCrns(section).length > 0;
}

/**
 * The one partner to add without asking. Null when Banner offers a choice,
 * because picking for the student would hide the other options.
 */
export function soloPartnerCrn(section: Section): number | null {
  const crns = partnerCrns(section);
  return needsPartner(section) && crns.length === 1 ? crns[0] : null;
}

/** Partners of a section that are already in the plan. */
export function plannedPartners(section: Section, plan: Section[]): Section[] {
  const crns = new Set(partnerCrns(section));
  return plan.filter(
    (other) => other.term.uid === section.term.uid && crns.has(other.crn),
  );
}

/** True when the section needs a partner and none of them is in the plan. */
export function missingPartner(section: Section, plan: Section[]): boolean {
  return needsPartner(section) && plannedPartners(section, plan).length === 0;
}

/** Every planned section that still has no partner beside it. */
export function unpairedSections(plan: Section[]): Section[] {
  return plan.filter((section) => missingPartner(section, plan));
}

/** Identifies a section across terms, for tracking what the student removed. */
export function sectionKey(termUid: number, crn: number): string {
  return `${termUid}-${crn}`;
}
