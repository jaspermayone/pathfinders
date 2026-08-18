import type { Section } from "../api/types";
import { sectionHue } from "../lib/schedule";
import { RmpBadge } from "./RmpBadge";
import { SeatBar } from "./SeatBar";

interface Props {
  section: Section;
  inPlan: boolean;
  conflicting: boolean;
  onToggle: (section: Section) => void;
}

const DAY_LETTER: Record<string, string> = {
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "R",
  friday: "F",
  saturday: "S",
  sunday: "U",
};

export function SectionCard({ section, inPlan, conflicting, onToggle }: Props) {
  const hue = sectionHue(section.crn);

  return (
    <article
      className={`rounded-lg border bg-white p-3 shadow-xs transition dark:bg-slate-900 ${
        conflicting
          ? "border-rose-400 dark:border-rose-600"
          : "border-slate-200 dark:border-slate-800"
      }`}
      style={{ borderLeft: `4px solid hsl(${hue} 70% 55%)` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
            {section.course_code}
            <span className="ml-2 font-normal text-slate-500">CRN {section.crn}</span>
          </h3>
          <p className="truncate text-sm text-slate-700 dark:text-slate-300">
            {section.title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggle(section)}
          aria-pressed={inPlan}
          className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium transition ${
            inPlan
              ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          {inPlan ? "In plan" : "Add"}
        </button>
      </div>

      <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
        {section.meeting_times.length === 0 ? (
          <span className="italic">No meeting times listed</span>
        ) : (
          section.meeting_times.map((meeting, index) => (
            <span key={index} className="tabular-nums">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {DAY_LETTER[meeting.day] ?? meeting.day}
              </span>{" "}
              {meeting.begin_time}–{meeting.end_time}
              {meeting.location?.display ? ` · ${meeting.location.display}` : ""}
            </span>
          ))
        )}
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {section.instructors.map((instructor) => (
          <span key={instructor.pub_id} className="flex items-center gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-300">{instructor.name}</span>
            <RmpBadge instructor={instructor} />
          </span>
        ))}
        {section.instructors.length === 0 && (
          <span className="text-sm italic text-slate-500">Instructor to be announced</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <SeatBar seats={section.seats} />
        <span className="text-xs text-slate-500">
          {section.credit_hours ?? "?"} cr · {section.schedule_type ?? "—"}
        </span>
      </div>

      {conflicting && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          This clashes with another section in your plan.
        </p>
      )}
    </article>
  );
}
