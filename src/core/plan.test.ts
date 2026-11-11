import { describe, expect, it } from "vitest";
import { parsePlan } from "./plan";
import { SAMPLE_COURSES } from "./sample";
import { DEFAULT_PREFERENCES } from "./scoring";

describe("parsePlan", () => {
  it("round-trips an exported plan", () => {
    const plan = { version: 1, courses: SAMPLE_COURSES, preferences: DEFAULT_PREFERENCES, semester: { start: "2026-09-21", end: "2027-01-08" } };
    expect(parsePlan(JSON.parse(JSON.stringify(plan)))).toEqual(JSON.parse(JSON.stringify(plan)));
  });

  it("fills in missing preferences with defaults", () => {
    const plan = parsePlan({ courses: [] });
    expect(plan.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(plan.semester).toEqual({ start: "", end: "" });
  });

  it("rejects files that are not plans or have bad meetings", () => {
    expect(() => parsePlan([1, 2])).toThrow(/not a schedule plan/);
    const bad = { courses: [{ code: "CS1", sections: [{ id: "1", meetings: [{ day: "Mon", start: "10:00", end: "09:00" }] }] }] };
    expect(() => parsePlan(bad)).toThrow(/CS1 section 1: .*ends before/);
  });
});
