import type { Section } from "../api/types";
import { WEEKDAYS } from "../api/types";
import {
  conflictingCrns,
  gridBounds,
  meetingsByDay,
  sectionHue,
  toMinutes,
} from "../lib/schedule";

const PIXELS_PER_MINUTE = 0.9;

const DAY_LABEL: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
};

/** The week view of a plan. Overlapping blocks are drawn side by side. */
export function ScheduleGrid({ sections }: { sections: Section[] }) {
  const { start, end } = gridBounds(sections);
  const byDay = meetingsByDay(sections);
  const clashing = conflictingCrns(sections);
  const height = (end - start) * PIXELS_PER_MINUTE;

  const hours: number[] = [];
  for (let minute = start; minute <= end; minute += 60) hours.push(minute);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[34rem] gap-1">
        <div className="w-12 shrink-0" style={{ paddingTop: "1.5rem" }}>
          {hours.slice(0, -1).map((minute) => (
            <div
              key={minute}
              className="text-right text-xs tabular-nums text-slate-400"
              style={{ height: 60 * PIXELS_PER_MINUTE }}
            >
              {String(Math.floor(minute / 60)).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {WEEKDAYS.map((day) => {
          const placed = byDay.get(day) ?? [];

          return (
            <div key={day} className="flex-1">
              <div className="pb-1 text-center text-xs font-medium text-slate-500">
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
                    style={{ top: (minute - start) * PIXELS_PER_MINUTE }}
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
                  const hue = sectionHue(section.crn);

                  return (
                    <div
                      key={`${section.crn}-${index}`}
                      className={`absolute overflow-hidden rounded px-1 py-0.5 text-[10px] leading-tight text-white ${
                        clashing.has(section.crn) ? "ring-2 ring-rose-500" : ""
                      }`}
                      style={{
                        top: (toMinutes(meeting.begin_time) - start) * PIXELS_PER_MINUTE,
                        height: Math.max(
                          16,
                          meeting.duration_minutes * PIXELS_PER_MINUTE - 2,
                        ),
                        left: `${column * width}%`,
                        width: `${width}%`,
                        backgroundColor: `hsl(${hue} 60% 42%)`,
                      }}
                      title={`${section.course_code} ${section.title}\n${meeting.begin_time}–${meeting.end_time}${
                        meeting.location?.display ? `\n${meeting.location.display}` : ""
                      }`}
                    >
                      <div className="truncate font-semibold">{section.course_code}</div>
                      <div className="truncate opacity-80">
                        {meeting.location?.display ?? "Online"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
