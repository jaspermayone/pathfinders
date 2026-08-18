import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PROJECT_URL, ProjectPromo } from "./ProjectPromo";

describe("ProjectPromo", () => {
  it("links to the calendar project", () => {
    render(<ProjectPromo />);

    const link = screen.getByRole("link", { name: /get wit calendar/i });
    expect(link).toHaveAttribute("href", PROJECT_URL);
  });

  it("opens the link in a new tab safely", () => {
    render(<ProjectPromo />);

    const link = screen.getByRole("link", { name: /get wit calendar/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("names itself for screen readers", () => {
    render(<ProjectPromo />);

    expect(
      screen.getByRole("complementary", { name: /registered already/i }),
    ).toBeInTheDocument();
  });
});
