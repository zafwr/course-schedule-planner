export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export type Day = (typeof DAYS)[number];
export const WEEKDAYS: readonly Day[] = DAYS.slice(0, 5);

/** One weekly class meeting, times as "HH:MM" (24h). */
export interface Meeting {
  day: Day;
  start: string;
  end: string;
}

export interface Section {
  id: string;
  instructor?: string;
  meetings: Meeting[];
  /** Section is full or otherwise not an option; the solver skips it. */
  excluded?: boolean;
}

export interface Course {
  code: string;
  name: string;
  sections: Section[];
  /** If set, only this section id is considered. */
  pinnedSection?: string;
}

export interface Choice {
  course: Course;
  section: Section;
}

/** One section per course, with no two meetings overlapping. */
export type Schedule = Choice[];
