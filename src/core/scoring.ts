import { sectionSlots, type Slot } from "./solver";
import { formatDuration, formatTime, toMinutes } from "./time";
import { DAYS, WEEKDAYS, type Day, type Schedule } from "./types";

export interface Preferences {
  /** Penalise days whose first class starts before this time ("HH:MM"), or null to ignore. */
  noClassesBefore: string | null;
  /** Penalise days whose last class ends after this time, or null to ignore. */
  noClassesAfter: string | null;
  /** Days the student wants completely free. */
  freeDays: Day[];
  /** Reward every weekday without classes. */
  compactWeek: boolean;
  /** Penalise idle time between classes on the same day. */
  minimizeGaps: boolean;
  /** Want at least 30 free minutes between 11:30 and 13:30 on campus days. */
  lunchBreak: boolean;
  /** Instructor names to avoid (case-insensitive substring match). */
  avoidInstructors: string[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  noClassesBefore: "09:30",
  noClassesAfter: null,
  freeDays: [],
  compactWeek: true,
  minimizeGaps: true,
  lunchBreak: true,
  avoidInstructors: [],
};

export const WEIGHTS = {
  earlyDay: 10,
  lateDay: 8,
  wantedFreeDay: 25,
  freeWeekday: -8,
  gapPer15Min: 1,
  noLunch: 6,
  avoidedInstructor: 20,
} as const;

const LUNCH_START = toMinutes("11:30");
const LUNCH_END = toMinutes("13:30");
const LUNCH_MIN = 30;

export interface ScheduleStats {
  /** Merged, sorted busy blocks per day. */
  byDay: Record<Day, Slot[]>;
  daysOnCampus: Day[];
  gapMinutes: number;
  classMinutes: number;
  earliestStart: number | null;
  latestEnd: number | null;
}

export interface ScoreItem {
  label: string;
  /** Positive = penalty, negative = bonus. */
  points: number;
}

export interface RankedSchedule {
  schedule: Schedule;
  penalty: number;
  items: ScoreItem[];
  stats: ScheduleStats;
}

export function scheduleStats(schedule: Schedule): ScheduleStats {
  const byDay = Object.fromEntries(DAYS.map((d) => [d, [] as Slot[]])) as Record<Day, Slot[]>;
  let classMinutes = 0;
  for (const { section } of schedule) {
    for (const slot of sectionSlots(section)) {
      byDay[slot.day].push({ ...slot });
      classMinutes += slot.end - slot.start;
    }
  }

  let gapMinutes = 0;
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;
  for (const day of DAYS) {
    const merged: Slot[] = [];
    for (const slot of byDay[day].sort((a, b) => a.start - b.start)) {
      const last = merged[merged.length - 1];
      if (last && slot.start <= last.end) last.end = Math.max(last.end, slot.end);
      else merged.push(slot);
    }
    for (let i = 1; i < merged.length; i++) gapMinutes += merged[i].start - merged[i - 1].end;
    if (merged.length) {
      earliestStart = Math.min(earliestStart ?? Infinity, merged[0].start);
      latestEnd = Math.max(latestEnd ?? -Infinity, merged[merged.length - 1].end);
    }
    byDay[day] = merged;
  }

  const daysOnCampus = DAYS.filter((d) => byDay[d].length > 0);
  return { byDay, daysOnCampus, gapMinutes, classMinutes, earliestStart, latestEnd };
}

/** Longest free stretch inside [from, to] given a day's merged busy blocks. */
function longestFree(blocks: Slot[], from: number, to: number): number {
  let cursor = from;
  let best = 0;
  for (const b of blocks) {
    if (b.end <= from || b.start >= to) continue;
    best = Math.max(best, Math.min(b.start, to) - cursor);
    cursor = Math.max(cursor, b.end);
  }
  return Math.max(best, to - cursor);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function scoreSchedule(schedule: Schedule, prefs: Preferences, stats = scheduleStats(schedule)): RankedSchedule {
  const items: ScoreItem[] = [];
  const add = (label: string, points: number) => points !== 0 && items.push({ label, points });

  if (prefs.noClassesBefore) {
    const limit = toMinutes(prefs.noClassesBefore);
    const early = stats.daysOnCampus.filter((d) => stats.byDay[d][0].start < limit);
    add(`${plural(early.length, "day")} start before ${prefs.noClassesBefore}`, early.length * WEIGHTS.earlyDay);
  }

  if (prefs.noClassesAfter) {
    const limit = toMinutes(prefs.noClassesAfter);
    const late = stats.daysOnCampus.filter((d) => stats.byDay[d].at(-1)!.end > limit);
    add(`${plural(late.length, "day")} end after ${prefs.noClassesAfter}`, late.length * WEIGHTS.lateDay);
  }

  for (const day of prefs.freeDays) {
    if (stats.byDay[day].length) add(`Classes on ${day} (wanted free)`, WEIGHTS.wantedFreeDay);
  }

  if (prefs.compactWeek) {
    const free = WEEKDAYS.filter((d) => stats.byDay[d].length === 0).length;
    add(`${plural(free, "free weekday")}`, free * WEIGHTS.freeWeekday);
  }

  if (prefs.minimizeGaps && stats.gapMinutes > 0) {
    add(`${formatDuration(stats.gapMinutes)} of gaps between classes`, Math.round(stats.gapMinutes / 15) * WEIGHTS.gapPer15Min);
  }

  if (prefs.lunchBreak) {
    const noLunch = stats.daysOnCampus.filter((d) => {
      const blocks = stats.byDay[d];
      const touchesLunch = blocks.some((b) => b.start < LUNCH_END && b.end > LUNCH_START);
      return touchesLunch && longestFree(blocks, LUNCH_START, LUNCH_END) < LUNCH_MIN;
    });
    add(
      `No lunch break (${formatTime(LUNCH_START)}–${formatTime(LUNCH_END)}) on ${plural(noLunch.length, "day")}`,
      noLunch.length * WEIGHTS.noLunch,
    );
  }

  const avoid = prefs.avoidInstructors.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (avoid.length) {
    for (const { course, section } of schedule) {
      const instructor = section.instructor?.toLowerCase() ?? "";
      if (avoid.some((name) => instructor.includes(name))) {
        add(`${course.code} with ${section.instructor}`, WEIGHTS.avoidedInstructor);
      }
    }
  }

  const penalty = items.reduce((sum, item) => sum + item.points, 0);
  return { schedule, penalty, items, stats };
}

/** Score every schedule and return the best ones first. Ties prefer fewer gaps, then earlier finish. */
export function rankSchedules(schedules: Schedule[], prefs: Preferences, top = 50): RankedSchedule[] {
  return schedules
    .map((s) => scoreSchedule(s, prefs))
    .sort(
      (a, b) =>
        a.penalty - b.penalty ||
        a.stats.gapMinutes - b.stats.gapMinutes ||
        (a.stats.latestEnd ?? 0) - (b.stats.latestEnd ?? 0),
    )
    .slice(0, top);
}
