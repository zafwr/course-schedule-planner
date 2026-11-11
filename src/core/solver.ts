import { toMinutes } from "./time";
import type { Course, Day, Schedule, Section } from "./types";

export interface Slot {
  day: Day;
  start: number;
  end: number;
}

const slotCache = new WeakMap<Section, Slot[]>();

/** Meetings of a section as minute ranges (cached, sections are treated as immutable). */
export function sectionSlots(section: Section): Slot[] {
  let slots = slotCache.get(section);
  if (!slots) {
    slots = section.meetings.map((m) => ({ day: m.day, start: toMinutes(m.start), end: toMinutes(m.end) }));
    slotCache.set(section, slots);
  }
  return slots;
}

/** Two sections clash if any of their meetings overlap. Back-to-back (10:20 / 10:20) is fine. */
export function sectionsConflict(a: Section, b: Section): boolean {
  for (const x of sectionSlots(a)) {
    for (const y of sectionSlots(b)) {
      if (x.day === y.day && x.start < y.end && y.start < x.end) return true;
    }
  }
  return false;
}

/** Sections the solver may pick for a course, after pins and exclusions. */
export function candidateSections(course: Course): Section[] {
  const open = course.sections.filter((s) => !s.excluded);
  if (course.pinnedSection) return open.filter((s) => s.id === course.pinnedSection);
  return open;
}

export interface SolveOptions {
  /** Stop after this many schedules (the search space grows exponentially). */
  limit?: number;
}

export interface SolveResult {
  schedules: Schedule[];
  /** True if the limit was reached, so there may be more schedules. */
  truncated: boolean;
  /** Number of section assignments tried, to show how much pruning saves. */
  nodes: number;
  /** Courses with no section left to choose (all excluded, or pinned to a missing one). */
  emptyCourses: string[];
  /** Pairs of courses that can never be taken together, filled only when nothing fits. */
  impossiblePairs: [string, string][];
}

/**
 * Enumerate every clash-free schedule (one section per course).
 *
 * Backtracking with forward checking: after picking a section, every remaining
 * course drops the sections that clash with it, and a branch is abandoned as soon
 * as some course has nothing left. The next course to fill is always the one with
 * the fewest options left (minimum remaining values), which keeps the tree small.
 */
export function solve(courses: Course[], options: SolveOptions = {}): SolveResult {
  const limit = options.limit ?? 5000;
  const domains0 = courses.map(candidateSections);
  const emptyCourses = courses.filter((_, i) => domains0[i].length === 0).map((c) => c.code);
  const result: SolveResult = { schedules: [], truncated: false, nodes: 0, emptyCourses, impossiblePairs: [] };
  if (courses.length === 0 || emptyCourses.length > 0) return result;

  const chosen: (Section | null)[] = courses.map(() => null);

  const search = (domains: (Section[] | null)[]): void => {
    let next = -1;
    for (let i = 0; i < domains.length; i++) {
      const d = domains[i];
      if (d && (next < 0 || d.length < domains[next]!.length)) next = i;
    }
    if (next < 0) {
      result.schedules.push(courses.map((course, i) => ({ course, section: chosen[i]! })));
      if (result.schedules.length >= limit) result.truncated = true;
      return;
    }

    for (const section of domains[next]!) {
      result.nodes++;
      let deadEnd = false;
      const remaining = domains.map((d, i) => {
        if (i === next || d === null) return null;
        const left = d.filter((other) => !sectionsConflict(other, section));
        if (left.length === 0) deadEnd = true;
        return left;
      });
      if (deadEnd) continue;
      chosen[next] = section;
      search(remaining);
      chosen[next] = null;
      if (result.truncated) return;
    }
  };

  search(domains0);

  if (result.schedules.length === 0) result.impossiblePairs = findImpossiblePairs(courses, domains0);
  return result;
}

function findImpossiblePairs(courses: Course[], domains: Section[][]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const compatible = domains[i].some((a) => domains[j].some((b) => !sectionsConflict(a, b)));
      if (!compatible) pairs.push([courses[i].code, courses[j].code]);
    }
  }
  return pairs;
}
