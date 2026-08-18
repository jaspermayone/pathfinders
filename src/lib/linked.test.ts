import { describe, expect, it } from "vitest";
import type { LinkedSections, Section } from "../api/types";
import {
  bundleKey,
  leadSections,
  linkKey,
  linkSlot,
  missingPartner,
  needsPartner,
  partnerCrns,
  plannedPartners,
  sectionKey,
  soloPartnerCrn,
  unpairedSections,
} from "./linked";

function section(crn: number, linked?: LinkedSections, termUid = 202710): Section {
  return {
    crn,
    pub_id: `pub-${crn}`,
    term: { uid: termUid, name: "Fall 2026" },
    subject: "Chemistry (CHEM)",
    subject_code: "CHEM",
    course_number: "1000",
    section_number: "1A",
    course_code: `CHEM 1000-${crn}`,
    title: "General Chemistry",
    schedule_type: "lecture",
    schedule_type_code: "LEC",
    credit_hours: 4,
    grade_mode: null,
    status: "active",
    seats: { capacity: 24, available: 6 },
    linked,
    start_date: "2026-09-08",
    end_date: "2026-12-15",
    instructors: [],
    meeting_times: [],
    final_exam: null,
  };
}

const LECTURE = section(1, { required: true, identifier: "A1", crns: [2, 3] });
const LAB_ONE = section(2, { required: true, identifier: "B1", crns: [1] });
const LAB_TWO = section(3, { required: true, identifier: "B1", crns: [1] });
const SOLO = section(9, { required: false, identifier: null, crns: [] });

describe("partnerCrns", () => {
  it("lists the CRNs Banner pairs with the section", () => {
    expect(partnerCrns(LECTURE)).toEqual([2, 3]);
  });

  it("is empty for a section that stands alone", () => {
    expect(partnerCrns(SOLO)).toEqual([]);
  });

  it("is empty when the API sends no linked field", () => {
    expect(partnerCrns(section(5))).toEqual([]);
  });
});

describe("needsPartner", () => {
  it("is true for a lecture with labs", () => {
    expect(needsPartner(LECTURE)).toBe(true);
  });

  it("is false for a section that stands alone", () => {
    expect(needsPartner(SOLO)).toBe(false);
  });

  it("is false when Banner names no partner, whatever the flag says", () => {
    expect(needsPartner(section(6, { required: true, identifier: "A1", crns: [] }))).toBe(
      false,
    );
  });
});

describe("soloPartnerCrn", () => {
  it("names the partner when there is only one", () => {
    expect(soloPartnerCrn(LAB_ONE)).toBe(1);
  });

  it("returns null when the student has a choice", () => {
    expect(soloPartnerCrn(LECTURE)).toBeNull();
  });

  it("returns null for a section that stands alone", () => {
    expect(soloPartnerCrn(SOLO)).toBeNull();
  });
});

describe("plannedPartners", () => {
  it("finds the partners already in the plan", () => {
    expect(plannedPartners(LECTURE, [LECTURE, LAB_TWO])).toEqual([LAB_TWO]);
  });

  it("does not match a CRN from another term", () => {
    const otherTerm = section(2, { required: true, identifier: "B1", crns: [1] }, 202620);

    expect(plannedPartners(LECTURE, [otherTerm])).toEqual([]);
  });
});

describe("missingPartner", () => {
  it("is true for a lecture planned without a lab", () => {
    expect(missingPartner(LECTURE, [LECTURE])).toBe(true);
  });

  it("is false once one lab is in the plan", () => {
    expect(missingPartner(LECTURE, [LECTURE, LAB_ONE])).toBe(false);
  });

  it("is false for a section that stands alone", () => {
    expect(missingPartner(SOLO, [SOLO])).toBe(false);
  });
});

describe("unpairedSections", () => {
  it("reports both sides while the plan holds only one", () => {
    expect(unpairedSections([LECTURE])).toEqual([LECTURE]);
  });

  it("reports nothing once the pair is complete", () => {
    expect(unpairedSections([LECTURE, LAB_ONE])).toEqual([]);
  });

  it("reports nothing for a plan of independent sections", () => {
    expect(unpairedSections([SOLO])).toEqual([]);
  });
});

describe("sectionKey", () => {
  it("keeps the same CRN in two terms apart", () => {
    expect(sectionKey(202710, 1)).not.toBe(sectionKey(202620, 1));
  });
});

describe("linkSlot and linkKey", () => {
  it("splits the identifier into the slot letter and the pair key", () => {
    expect(linkSlot(LECTURE)).toBe("A");
    expect(linkKey(LECTURE)).toBe("1");
    expect(linkSlot(LAB_ONE)).toBe("B");
    expect(linkKey(LAB_ONE)).toBe("1");
  });

  it("is null for a section Banner does not pair", () => {
    expect(linkSlot(SOLO)).toBeNull();
    expect(linkKey(SOLO)).toBeNull();
  });
});

describe("bundleKey", () => {
  it("is the same for a lecture and its labs", () => {
    expect(bundleKey(LAB_ONE)).toBe(bundleKey(LECTURE));
    expect(bundleKey(LAB_TWO)).toBe(bundleKey(LECTURE));
  });

  it("differs for another course with the same identifier", () => {
    const other = { ...section(4, { required: true, identifier: "A1", crns: [] }) };
    other.subject_code = "PHYS";
    expect(bundleKey(other)).not.toBe(bundleKey(LECTURE));
  });

  it("differs for the same pair key in another term", () => {
    const later = section(1, { required: true, identifier: "A1", crns: [2] }, 202810);
    expect(bundleKey(later)).not.toBe(bundleKey(LECTURE));
  });

  it("falls back to the CRN for an unpaired section", () => {
    expect(bundleKey(SOLO)).toBe("crn:202710:9");
    expect(bundleKey(section(5))).toBe("crn:202710:5");
  });
});

describe("leadSections", () => {
  it("keeps the lecture and drops its labs from the top level", () => {
    expect(leadSections([LECTURE, LAB_ONE, LAB_TWO])).toEqual([LECTURE]);
  });

  it("keeps the page order", () => {
    expect(leadSections([LAB_ONE, SOLO, LECTURE])).toEqual([SOLO, LECTURE]);
  });

  it("keeps a lab whose lecture is not on the page", () => {
    expect(leadSections([LAB_ONE, LAB_TWO])).toEqual([LAB_ONE, LAB_TWO]);
  });

  it("keeps two lectures, because they are alternatives", () => {
    const second = section(4, { required: true, identifier: "A1", crns: [2, 3] });
    expect(leadSections([LECTURE, second])).toEqual([LECTURE, second]);
  });

  it("leaves unpaired sections alone", () => {
    expect(leadSections([SOLO, section(5)])).toEqual([SOLO, section(5)]);
  });
});
