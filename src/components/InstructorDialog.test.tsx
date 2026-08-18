import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstructorDialog } from "./InstructorDialog";
import type { Instructor } from "../api/types";

const RELAY_ID = "VGVhY2hlci0yNzQ3NDg0";

function instructor(overrides: Partial<Instructor> = {}): Instructor {
  return {
    pub_id: "inst_1",
    name: "Federica Aveta",
    first_name: "Federica",
    last_name: "Aveta",
    title: "Professor",
    department: "Sciences",
    school: null,
    rmp: {
      id: RELAY_ID,
      avg_rating: 1.9,
      avg_difficulty: 3.9,
      num_ratings: 11,
      would_take_again_percent: 27.27,
    },
    ...overrides,
  };
}

describe("InstructorDialog", () => {
  it("shows the name, the score, and the breakdown", () => {
    render(<InstructorDialog instructor={instructor()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Federica Aveta");
    expect(screen.getByText("Professor · Sciences")).toBeInTheDocument();
    expect(screen.getByText("11 ratings")).toBeInTheDocument();
    expect(screen.getByText("3.9 / 5")).toBeInTheDocument();
    expect(screen.getByText("27%")).toBeInTheDocument();
  });

  it("links to the Rate My Professors page", () => {
    render(<InstructorDialog instructor={instructor()} onClose={vi.fn()} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://www.ratemyprofessors.com/professor/2747484",
    );
  });

  it("says so when there are no ratings, and offers no link", () => {
    render(<InstructorDialog instructor={instructor({ rmp: null })} onClose={vi.fn()} />);

    expect(
      screen.getByText("No Rate My Professors ratings for this instructor."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("reports missing would-take-again data instead of showing 0%", () => {
    render(
      <InstructorDialog
        instructor={instructor({
          rmp: {
            id: RELAY_ID,
            avg_rating: 4,
            avg_difficulty: 2,
            num_ratings: 3,
            would_take_again_percent: null,
          },
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("closes on the close button and on Escape", () => {
    const onClose = vi.fn();
    render(<InstructorDialog instructor={instructor()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps the popup open when the panel itself is clicked", () => {
    const onClose = vi.fn();
    render(<InstructorDialog instructor={instructor()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
