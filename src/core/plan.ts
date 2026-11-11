import { DEFAULT_PREFERENCES, type Preferences } from "./scoring";
import { ParseError, parseMeetings } from "./time";
import { DAYS, type Course, type Day } from "./types";

/** Everything the app saves: courses, preferences and semester dates. */
export interface Plan {
  version: 1;
  courses: Course[];
  preferences: Preferences;
  semester: { start: string; end: string };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

/**
 * Validate an imported JSON plan. Meetings are re-parsed so a hand-edited file
 * with a typo is rejected with a clear message instead of breaking the solver.
 */
export function parsePlan(data: unknown): Plan {
  if (!isObject(data) || !Array.isArray(data.courses)) throw new ParseError("file is not a schedule plan (missing courses)");

  const courses: Course[] = data.courses.map((raw, i) => {
    if (!isObject(raw) || !Array.isArray(raw.sections)) throw new ParseError(`course #${i + 1} has no sections list`);
    const code = str(raw.code).trim() || `COURSE${i + 1}`;
    return {
      code,
      name: str(raw.name),
      pinnedSection: typeof raw.pinnedSection === "string" ? raw.pinnedSection : undefined,
      sections: raw.sections.map((s, j) => {
        if (!isObject(s) || !Array.isArray(s.meetings)) throw new ParseError(`${code} section #${j + 1} has no meetings list`);
        const text = s.meetings
          .map((m) => (isObject(m) ? `${str(m.day)} ${str(m.start)}-${str(m.end)}` : ""))
          .join(", ");
        let meetings;
        try {
          meetings = s.meetings.length ? parseMeetings(text) : [];
        } catch (error) {
          throw new ParseError(`${code} section ${str(s.id, String(j + 1))}: ${(error as Error).message}`);
        }
        return {
          id: str(s.id, String(j + 1)),
          instructor: typeof s.instructor === "string" ? s.instructor : undefined,
          excluded: s.excluded === true || undefined,
          meetings,
        };
      }),
    };
  });

  const p = isObject(data.preferences) ? data.preferences : {};
  const time = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);
  const preferences: Preferences = {
    noClassesBefore: "noClassesBefore" in p ? time(p.noClassesBefore) : DEFAULT_PREFERENCES.noClassesBefore,
    noClassesAfter: "noClassesAfter" in p ? time(p.noClassesAfter) : DEFAULT_PREFERENCES.noClassesAfter,
    freeDays: Array.isArray(p.freeDays) ? p.freeDays.filter((d): d is Day => DAYS.includes(d as Day)) : [],
    compactWeek: typeof p.compactWeek === "boolean" ? p.compactWeek : DEFAULT_PREFERENCES.compactWeek,
    minimizeGaps: typeof p.minimizeGaps === "boolean" ? p.minimizeGaps : DEFAULT_PREFERENCES.minimizeGaps,
    lunchBreak: typeof p.lunchBreak === "boolean" ? p.lunchBreak : DEFAULT_PREFERENCES.lunchBreak,
    avoidInstructors: Array.isArray(p.avoidInstructors) ? p.avoidInstructors.filter((n): n is string => typeof n === "string") : [],
  };

  const sem = isObject(data.semester) ? data.semester : {};
  const date = (v: unknown, fallback: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback);
  const semester = { start: date(sem.start, ""), end: date(sem.end, "") };

  return { version: 1, courses, preferences, semester };
}

