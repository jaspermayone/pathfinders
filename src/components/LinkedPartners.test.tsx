import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkedSections, Section } from "../api/types";
import { LinkedPartners } from "./LinkedPartners";

function section(crn: number, linked?: LinkedSections): Section {
  return {
    crn,
    pub_id: `pub-${crn}`,
    term: { uid: 202710, name: "Fall 2026" },
    subject: "Chemistry (CHEM)",
    subject_code: "CHEM",
    course_number: "1000",
    section_number: `${crn}A`,
    course_code: "CHEM 1000-1A",
    title: "General Chemistry",
    schedule_type: "lab",
    schedule_type_code: "LAB",
    credit_hours: 0,
    grade_mode: null,
    status: "active",
    seats: { capacity: 24, available: 6 },
    linked,
    start_date: "2026-09-08",
    end_date: "2026-12-15",
    instructors: [],
    meeting_times: [
      {
        day: "tuesday",
        day_of_week: 2,
        begin_time: "08:00",
        end_time: "09:50",
        begin_time_12h: "8:00 AM",
        end_time_12h: "9:50 AM",
        duration_minutes: 110,
        meeting_type: "Class",
        all_day: false,
        location: null,
      },
    ],
    final_exam: null,
  };
}

const LECTURE = section(1, { required: true, identifier: "A1", crns: [2, 3] });

describe("LinkedPartners", () => {
  it("shows nothing for a section that stands alone", () => {
    const { container } = render(
      <LinkedPartners section={section(9)} partners={[]} onToggle={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("names the partner CRNs while the sections are still loading", () => {
    render(<LinkedPartners section={LECTURE} partners={[]} onToggle={() => {}} />);

    expect(screen.getByText("CRN 2, 3")).toBeInTheDocument();
  });

  it("lists each partner with its CRN and meeting time", () => {
    render(
      <LinkedPartners
        section={LECTURE}
        partners={[section(2), section(3)]}
        onToggle={() => {}}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText(/lab · 08:00–09:50/)).toHaveLength(2);
  });

  it("adds the partner the button names", () => {
    const onToggle = vi.fn();
    const lab = section(2);

    render(<LinkedPartners section={LECTURE} partners={[lab]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Add CRN 2" }));

    expect(onToggle).toHaveBeenCalledWith(lab);
  });

  it("marks a partner already in the plan", () => {
    render(
      <LinkedPartners
        section={LECTURE}
        partners={[section(2)]}
        plannedCrns={new Set([2])}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove CRN 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
