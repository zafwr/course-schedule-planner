import { describe, expect, it } from "vitest";
import { sectionsConflict, solve } from "./solver";
import { parseMeetings } from "./time";
import type { Course, Section } from "./types";

const section = (id: string, meetings: string, extra: Partial<Section> = {}): Section => ({
  id,
  meetings: parseMeetings(meetings),
  ...extra,
});
const course = (code: string, sections: Section[], extra: Partial<Course> = {}): Course => ({
  code,
  name: code,
  sections,
  ...extra,
});
const picks = (schedules: ReturnType<typeof solve>["schedules"]) =>
  schedules.map((s) => s.map((c) => `${c.course.code}.${c.section.id}`).join(" ")).sort();

describe("sectionsConflict", () => {
  it("detects overlaps on the same day only", () => {
    const a = section("1", "Mon 09:30-11:20");
    expect(sectionsConflict(a, section("2", "Mon 11:00-12:00"))).toBe(true);
    expect(sectionsConflict(a, section("3", "Tue 09:30-11:20"))).toBe(false);
  });

  it("allows back-to-back classes", () => {
    expect(sectionsConflict(section("1", "Mon 09:30-10:20"), section("2", "Mon 10:20-11:10"))).toBe(false);
  });
});

describe("solve", () => {
  const algorithms = course("ALG", [section("1", "Mon 09:30-11:20"), section("2", "Tue 09:30-11:20")]);
  const os = course("OS", [section("1", "Mon 10:30-12:20"), section("2", "Wed 09:30-11:20")]);
  const db = course("DB", [section("1", "Tue 10:30-12:20"), section("2", "Thu 13:30-15:20")]);

  it("finds exactly the clash-free combinations", () => {
    const result = solve([algorithms, os, db]);
    // ALG.1 clashes with OS.1, ALG.2 clashes with DB.1.
    expect(picks(result.schedules)).toEqual([
      "ALG.1 OS.2 DB.1",
      "ALG.1 OS.2 DB.2",
      "ALG.2 OS.1 DB.2",
      "ALG.2 OS.2 DB.2",
    ]);
    expect(result.truncated).toBe(false);
  });

  it("matches brute force on a larger random case", () => {
    const random = mulberry32(7);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const courses = Array.from({ length: 6 }, (_, c) =>
      course(
        `C${c}`,
        Array.from({ length: 3 }, (_, s) => {
          const day = days[Math.floor(random() * 5)];
          const start = 8 + Math.floor(random() * 8);
          return section(String(s + 1), `${day} ${start}:30-${start + 1}:20, ${days[(c + s) % 5]} ${start}:30-${start + 2}:20`);
        }),
      ),
    );

    let bruteForce = 0;
    const walk = (i: number, taken: Section[]) => {
      if (i === courses.length) return void bruteForce++;
      for (const s of courses[i].sections) {
        if (taken.every((t) => !sectionsConflict(t, s))) walk(i + 1, [...taken, s]);
      }
    };
    walk(0, []);

    const result = solve(courses);
    expect(result.schedules.length).toBe(bruteForce);
    expect(new Set(picks(result.schedules)).size).toBe(bruteForce);
  });

  it("respects excluded and pinned sections", () => {
    const pinned = { ...algorithms, pinnedSection: "2" };
    const full = { ...os, sections: [os.sections[0], { ...os.sections[1], excluded: true }] };
    expect(picks(solve([pinned, full, db]).schedules)).toEqual(["ALG.2 OS.1 DB.2"]);
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: 4 }, (_, i) =>
      course(`X${i}`, ["Mon", "Tue", "Wed", "Thu"].map((d, j) => section(String(j), `${d} ${8 + i * 2}:00-${9 + i * 2}:00`))),
    );
    const result = solve(many, { limit: 10 });
    expect(result.schedules).toHaveLength(10);
    expect(result.truncated).toBe(true);
  });

  it("explains why nothing fits", () => {
    const lab = course("LAB", [section("A", "Mon 09:00-12:00, Tue 10:00-11:00"), section("B", "Tue 09:00-12:00, Mon 10:00-11:00")]);
    const result = solve([algorithms, lab]);
    expect(result.schedules).toHaveLength(0);
    expect(result.impossiblePairs).toEqual([["ALG", "LAB"]]);

    const closed = course("CLOSED", [section("1", "Fri 09:00-10:00", { excluded: true })]);
    expect(solve([algorithms, closed]).emptyCourses).toEqual(["CLOSED"]);
  });
});

// Small deterministic PRNG so the random test is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
