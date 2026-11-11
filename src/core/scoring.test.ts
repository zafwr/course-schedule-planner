import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, rankSchedules, scheduleStats, scoreSchedule, type Preferences } from "./scoring";
import { parseMeetings } from "./time";
import type { Schedule } from "./types";

const schedule = (...sections: [string, string, string?][]): Schedule =>
  sections.map(([code, meetings, instructor]) => ({
    course: { code, name: code, sections: [] },
    section: { id: "1", meetings: parseMeetings(meetings), instructor },
  }));

const none: Preferences = {
  noClassesBefore: null,
  noClassesAfter: null,
  freeDays: [],
  compactWeek: false,
  minimizeGaps: false,
  lunchBreak: false,
  avoidInstructors: [],
};

describe("scheduleStats", () => {
  it("merges overlapping blocks and measures gaps", () => {
    const stats = scheduleStats(schedule(["A", "Mon 09:30-11:20"], ["B", "Mon 11:30-12:20, Mon 15:30-16:20"], ["C", "Wed 10:30-11:20"]));
    expect(stats.daysOnCampus).toEqual(["Mon", "Wed"]);
    expect(stats.gapMinutes).toBe(10 + 190);
    expect(stats.earliestStart).toBe(570);
    expect(stats.latestEnd).toBe(16 * 60 + 20);
  });
});

describe("scoreSchedule", () => {
  it("is zero with no preferences", () => {
    expect(scoreSchedule(schedule(["A", "Mon 08:30-10:20"]), none).penalty).toBe(0);
  });

  it("penalises early starts per day", () => {
    const result = scoreSchedule(schedule(["A", "Mon 08:30-10:20, Tue 08:30-09:20, Wed 10:30-11:20"]), {
      ...none,
      noClassesBefore: "09:30",
    });
    expect(result.items).toEqual([{ label: "2 days start before 09:30", points: 20 }]);
  });

  it("penalises classes on wanted free days and rewards free weekdays", () => {
    const result = scoreSchedule(schedule(["A", "Mon 10:30-12:20, Fri 10:30-11:20"]), {
      ...none,
      freeDays: ["Fri"],
      compactWeek: true,
    });
    expect(result.items).toEqual([
      { label: "Classes on Fri (wanted free)", points: 25 },
      { label: "3 free weekdays", points: -24 },
    ]);
  });

  it("checks for a lunch break only on days with classes around noon", () => {
    const busyNoon = schedule(["A", "Mon 11:30-12:20, Mon 12:30-13:20, Tue 09:30-10:20"]);
    const result = scoreSchedule(busyNoon, { ...none, lunchBreak: true });
    expect(result.items.map((i) => i.label)).toEqual(["No lunch break (11:30–13:30) on 1 day"]);

    const withBreak = schedule(["A", "Mon 11:30-12:20, Mon 13:00-14:00"]);
    expect(scoreSchedule(withBreak, { ...none, lunchBreak: true }).penalty).toBe(0);
  });

  it("flags avoided instructors", () => {
    const result = scoreSchedule(schedule(["A", "Mon 10:30-12:20", "Dr. Example Hoca"]), {
      ...none,
      avoidInstructors: ["example"],
    });
    expect(result.penalty).toBe(20);
  });
});

describe("rankSchedules", () => {
  it("puts the schedule that best matches preferences first", () => {
    const early = schedule(["A", "Mon 08:30-10:20"], ["B", "Tue 08:30-10:20"]);
    const late = schedule(["A", "Mon 10:30-12:20"], ["B", "Mon 13:30-15:20"]);
    const gappy = schedule(["A", "Mon 10:30-11:20"], ["B", "Mon 16:30-17:20"]);
    const ranked = rankSchedules([early, gappy, late], DEFAULT_PREFERENCES);
    expect(ranked.map((r) => r.schedule)).toEqual([late, gappy, early]);
  });
});
