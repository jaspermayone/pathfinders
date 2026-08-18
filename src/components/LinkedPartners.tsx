import type { Section } from "../api/types";
import { needsPartner, partnerCrns } from "../lib/linked";

interface Props {
  section: Section;
  partners: Section[];
  plannedCrns?: Set<number>;
  onToggle: (section: Section) => void;
}

function summarise(section: Section): string {
  const type = section.schedule_type ?? "section";
  const meeting = section.meeting_times[0];
  if (!meeting) return type;
  return `${type} · ${meeting.begin_time}–${meeting.end_time}`;
}

/**
 * Banner pairs some sections, most often a lecture and its lab. A student must
 * register for both, so the card names the partners and offers to add them.
 * The partner list can be empty while the extra sections load, or when the API
 * build in front of this page is older than the pairing field.
 */
export function LinkedPartners({ section, partners, plannedCrns, onToggle }: Props) {
  if (!needsPartner(section)) return null;

  const total = partnerCrns(section).length;
  const heading =
    total === 1
      ? "Register this with its partner section:"
      : "Register this with one of these sections:";

  return (
    <div className="mt-2 rounded border border-sky-200 bg-sky-50 p-2 text-xs dark:border-sky-900 dark:bg-sky-950/40">
      <p className="font-medium text-sky-900 dark:text-sky-200">{heading}</p>

      {partners.length === 0 ? (
        <p className="mt-1 text-sky-900/80 dark:text-sky-200/80">
          CRN {partnerCrns(section).join(", ")}
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {partners.map((partner) => {
            const inPlan = plannedCrns?.has(partner.crn) ?? false;

            return (
              <li key={partner.crn} className="flex items-center justify-between gap-2">
                <span className="truncate text-sky-900/80 dark:text-sky-200/80">
                  <span className="font-medium">{partner.section_number}</span> · CRN{" "}
                  <span className="tabular-nums">{partner.crn}</span> ·{" "}
                  {summarise(partner)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(partner)}
                  aria-pressed={inPlan}
                  aria-label={`${inPlan ? "Remove" : "Add"} CRN ${partner.crn}`}
                  className={`shrink-0 rounded px-1.5 py-0.5 font-medium transition ${
                    inPlan
                      ? "bg-sky-900 text-white dark:bg-sky-200 dark:text-sky-950"
                      : "border border-sky-400 text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-200 dark:hover:bg-sky-900"
                  }`}
                >
                  {inPlan ? "In plan" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
