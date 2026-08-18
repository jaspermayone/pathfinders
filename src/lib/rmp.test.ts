import { describe, expect, it } from "vitest";
import {
  bestRating,
  hasRmpData,
  meetsMinRating,
  rmpProfessorId,
  rmpUrl,
} from "./rmp";
import type { Instructor } from "../api/types";

// base64("Teacher-2747484"), taken from a live catalog response.
const RELAY_ID = "VGVhY2hlci0yNzQ3NDg0";

function instructor(overrides: Partial<Instructor> = {}): Instructor {
  return {
    pub_id: "inst_1",
    name: "Federica Aveta",
    first_name: "Federica",
    last_name: "Aveta",
    title: null,
    department: null,
    school: null,
    rmp: null,
    ...overrides,
  };
}

describe("rmpProfessorId", () => {
  it("decodes the relay id to the numeric professor id", () => {
    expect(rmpProfessorId(RELAY_ID)).toBe("2747484");
  });

  it("returns null for a missing id", () => {
    expect(rmpProfessorId(null)).toBeNull();
  });

  it("returns null for text that is not base64", () => {
    expect(rmpProfessorId("!!!not base64!!!")).toBeNull();
  });

  it("returns null when the decoded value is not a Teacher id", () => {
    expect(rmpProfessorId(btoa("School-1234"))).toBeNull();
  });
});

describe("rmpUrl", () => {
  it("builds the public profile url", () => {
    expect(rmpUrl(RELAY_ID)).toBe(
      "https://www.ratemyprofessors.com/professor/2747484",
    );
  });

  it("returns null when the id cannot be decoded", () => {
    expect(rmpUrl(null)).toBeNull();
  });
});

describe("hasRmpData", () => {
  it("is false without an rmp record", () => {
    expect(hasRmpData(instructor())).toBe(false);
  });

  it("is false when the record holds no ratings", () => {
    expect(
      hasRmpData(
        instructor({
          rmp: {
            id: RELAY_ID,
            avg_rating: 0,
            avg_difficulty: 0,
            num_ratings: 0,
            would_take_again_percent: null,
          },
        }),
      ),
    ).toBe(false);
  });

  it("is true when there is at least one rating", () => {
    expect(
      hasRmpData(
        instructor({
          rmp: {
            id: RELAY_ID,
            avg_rating: 1.9,
            avg_difficulty: 3.9,
            num_ratings: 11,
            would_take_again_percent: 27.27,
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("bestRating and meetsMinRating", () => {
  const rated = (avg: number) =>
    instructor({
      pub_id: `inst_${avg}`,
      rmp: {
        id: RELAY_ID,
        avg_rating: avg,
        avg_difficulty: 3,
        num_ratings: 5,
        would_take_again_percent: 50,
      },
    });

  it("takes the highest rating among the instructors", () => {
    expect(bestRating([rated(2.1), rated(4.4), instructor()])).toBe(4.4);
  });

  it("has no best rating when nobody is rated", () => {
    expect(bestRating([instructor()])).toBeNull();
  });

  it("passes a section whose best instructor clears the bar", () => {
    expect(meetsMinRating([rated(2.1), rated(4.4)], 4)).toBe(true);
  });

  it("drops a section whose instructors are all below the bar", () => {
    expect(meetsMinRating([rated(2.1)], 4)).toBe(false);
  });

  it("drops a section with no rated instructor", () => {
    expect(meetsMinRating([instructor()], 4)).toBe(false);
  });

  it("keeps everything when the bar is zero", () => {
    expect(meetsMinRating([instructor()], 0)).toBe(true);
  });
});
