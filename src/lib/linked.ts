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

/**
 * The slot letter Banner puts first in the identifier. "A" marks the lecture
 * and "B" marks its labs, so the letter says which side of the pair this is.
 */
export function linkSlot(section: Section): string | null {
  const identifier = section.linked?.identifier;
  return identifier ? identifier.slice(0, 1) : null;
}

/** The rest of the identifier, which is the same for both sides of a pair. */
export function linkKey(section: Section): string | null {
  const identifier = section.linked?.identifier;
  return identifier ? identifier.slice(1) : null;
}

/**
 * One key for a whole pairing. A lecture and its labs share it, so they can be
 * shown as one course. A section Banner does not pair keeps its own key.
 */
export function bundleKey(section: Section): string {
  const key = linkKey(section);
  if (key === null) return `crn:${section.term.uid}:${section.crn}`;

  return `link:${section.term.uid}:${section.subject_code}:${section.course_number}:${key}`;
}

/**
 * The sections to show at the top level of a result list. A partner that is on
 * the page and belongs under another section is left out, because the card of
 * that section lists it. The page order is kept.
 *
 * A lab whose lecture is not on the page stays at the top level. So do two
 * sections in the same slot, for example two lectures, because they are
 * alternatives to each other and not a pair.
 */
export function leadSections(sections: Section[]): Section[] {
  const groups = new Map<string, Section[]>();

  for (const section of sections) {
    const key = bundleKey(section);
    const group = groups.get(key);
    if (group) group.push(section);
    else groups.set(key, [section]);
  }

  const nested = new Set<Section>();

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const slots = group.map(linkSlot).filter((slot): slot is string => slot !== null);
    const lead = [...group].sort(bySlot)[0];
    const leadSlot = linkSlot(lead);
    if (new Set(slots).size < 2) continue;

    for (const section of group) {
      if (section !== lead && linkSlot(section) !== leadSlot) nested.add(section);
    }
  }

  return sections.filter((section) => !nested.has(section));
}

/** Sorts the first slot letter first, so the lecture leads its labs. */
function bySlot(a: Section, b: Section): number {
  return (linkSlot(a) ?? "").localeCompare(linkSlot(b) ?? "");
}

/** Identifies a section across terms, for tracking what the student removed. */
export function sectionKey(termUid: number, crn: number): string {
  return `${termUid}-${crn}`;
}
