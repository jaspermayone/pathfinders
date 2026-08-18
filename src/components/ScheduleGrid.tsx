import type { Section } from "../api/types";
import { WEEKDAYS } from "../api/types";
import {
  conflictingCrns,
  gridBounds,
  gridScale,
  hourLabel,
  meetingsByDay,
  sectionHue,
  toMinutes,
  unscheduledSections,
} from "../lib/schedule";
import { needsPartner, partnerCrns } from "../lib/linked";

/**
 * Marks a block a student cannot register on its own. The block already shares
 * its colour with the partner, and the mark says the colour means a pairing.
 */
function LinkMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-px size-2.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M12.5 6.5 15 4a4.6 4.6 0 0 1 6.5 6.5L19 13" />
      <path d="M11.5 17.5 9 20a4.6 4.6 0 0 1-6.5-6.5L5 11" />
    </svg>
  );
}

const DAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
};

/** A block shorter than this has room for the course code only. */
const ROOM_LINE_HEIGHT = 26;

/** The week view of a plan. Overlapping blocks are drawn side by side. */
export function ScheduleGrid({ sections }: { sections: Section[] }) {
  const { start, end } = gridBounds(sections);
  const byDay = meetingsByDay(sections);
  const clashing = conflictingCrns(sections);
  const scale = gridScale(start, end);
  const unscheduled = unscheduledSections(sections);
  const height = (end - start) * scale;

  const hours: number[] = [];
  for (let minute = start; minute <= end; minute += 60) hours.push(minute);

  return (
    <>
      <div className="flex gap-1">
        <div className="w-5 shrink-0" style={{ paddingTop: "1.25rem" }}>
          {hours.slice(0, -1).map((minute) => (
            <div
              key={minute}
              className="text-right text-[10px] leading-none tabular-nums text-slate-400"
              style={{ height: 60 * scale }}
            >
              {hourLabel(minute)}
            </div>
          ))}
        </div>

        {WEEKDAYS.map((day) => {
          const placed = byDay.get(day) ?? [];

          return (
            <div key={day} className="min-w-0 flex-1">
              <div className="pb-1 text-center text-[11px] font-medium leading-none text-slate-500">
                {DAY_LABEL[day]}
              </div>
              <div
                className="relative rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                style={{ height }}
              >
                {hours.slice(1, -1).map((minute) => (
                  <div
                    key={minute}
                    className="absolute inset-x-0 border-t border-slate-200/70 dark:border-slate-800"
                    style={{ top: (minute - start) * scale }}
                  />
                ))}

                {placed.map(({ section, meeting }, index) => {
                  // Blocks that share this slot sit side by side rather than
                  // hiding each other, so a clash is visible, not silent.
                  const siblings = placed.filter(
                    (other) =>
                      toMinutes(other.meeting.begin_time) < toMinutes(meeting.end_time) &&
                      toMinutes(meeting.begin_time) < toMinutes(other.meeting.end_time),
                  );
                  const column = siblings.indexOf(placed[index]);
                  const width = 100 / Math.max(1, siblings.length);
                  const hue = sectionHue(section);
                  const paired = needsPartner(section);
                  const blockHeight = Math.max(14, meeting.duration_minutes * scale - 2);

                  return (
                    <div
                      key={`${section.crn}-${index}`}
                      className={`absolute overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight text-white ${
                        clashing.has(section.crn) ? "ring-2 ring-rose-500" : ""
                      }`}
                      style={{
                        top: (toMinutes(meeting.begin_time) - start) * scale,
                        height: blockHeight,
                        left: `${column * width}%`,
                        width: `${width}%`,
                        backgroundColor: `hsl(${hue} 60% 42%)`,
                      }}
                      title={`${section.course_code} ${section.title}\n${meeting.begin_time}–${meeting.end_time}${
                        meeting.location?.display ? `\n${meeting.location.display}` : ""
                      }${
                        paired
                          ? `\nRegister with CRN ${partnerCrns(section).join(" or ")}`
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-0.5 font-semibold">
                        {paired && <LinkMark />}
                        {/* The column is narrow, so the block drops the section
                          suffix and wraps. The tooltip keeps the full code. */}
                        <span className="line-clamp-2 break-words">
                          {section.subject_code} {section.course_number}
                        </span>
                      </div>
                      {blockHeight >= ROOM_LINE_HEIGHT && (
                        <div className="truncate opacity-80">
                          {meeting.location?.display ?? "Online"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          No meeting time, so not on the week view:{" "}
          {unscheduled.map((section) => section.course_code).join(", ")}
        </p>
      )}
    </>
  );
}
