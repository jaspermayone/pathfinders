import type { Section } from "../api/types";
import { partnerCrns } from "./linked";

/** The API rejects a page larger than this, so long CRN lists go in batches. */
export const CRN_BATCH_SIZE = 50;

/**
 * CRNs the page needs but does not hold. A lecture often pairs with a lab on
 * another page, so the card cannot show the pairing from the page alone.
 */
export function missingPartnerCrns(sections: Section[]): number[] {
  const onPage = new Set(sections.map((section) => section.crn));
  const wanted = new Set<number>();

  for (const section of sections) {
    for (const crn of partnerCrns(section)) {
      if (!onPage.has(crn)) wanted.add(crn);
    }
  }

  return [...wanted].sort((a, b) => a - b);
}

export function batchCrns(crns: number[], size = CRN_BATCH_SIZE): number[][] {
  const batches: number[][] = [];

  for (let index = 0; index < crns.length; index += size) {
    batches.push(crns.slice(index, index + size));
  }

  return batches;
}

/** One place to look up any section the page can reach, on it or fetched. */
export function indexByCrn(...groups: Section[][]): Map<number, Section> {
  const byCrn = new Map<number, Section>();

  for (const group of groups) {
    for (const section of group) byCrn.set(section.crn, section);
  }

  return byCrn;
}

export function partnersOf(
  section: Section,
  byCrn: Map<number, Section>,
): Section[] {
  return partnerCrns(section)
    .map((crn) => byCrn.get(crn))
    .filter((partner): partner is Section => partner !== undefined);
}
