import type { Term } from "../api/types";

/**
 * Terms worth offering, newest first.
 *
 * The catalog lists every term the registrar has ever defined, 49 of them,
 * reaching back to 2013 and forward to 2028. Only the imported ones hold
 * sections. Offering the rest gives a student a term that answers with
 * nothing, so filter on the count the API already returns.
 */
export function selectableTerms(terms: Term[]): Term[] {
  return terms
    // section_count is optional on the type because a term nested inside a
    // section omits it. The terms index always sends it, so a missing count
    // here means the API changed shape, and an empty list says so loudly.
    .filter((term) => (term.section_count ?? 0) > 0)
    .sort((a, b) => b.uid - a.uid);
}

/** The term to land on before anyone touches the filters. */
export function defaultTermUid(terms: Term[]): number | undefined {
  return selectableTerms(terms)[0]?.uid;
}
