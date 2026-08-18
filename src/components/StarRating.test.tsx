import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  it("labels the score for screen readers", () => {
    render(<StarRating value={3.7} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("3.7 out of 5");
  });

  it("fills the overlay in proportion to the score", () => {
    const { container } = render(<StarRating value={2.5} />);
    const overlay = container.querySelector("span > span:nth-child(2)");
    expect(overlay).toHaveStyle({ width: "50%" });
  });

  it("clamps a score above five", () => {
    render(<StarRating value={9} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("5.0 out of 5");
  });
});
