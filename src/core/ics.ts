import { DAYS, type Schedule } from "./types";

export interface IcsOptions {
  /** First day of classes, "YYYY-MM-DD". */
  semesterStart: string;
  /** Last day of classes, "YYYY-MM-DD". */
  semesterEnd: string;
  calendarName?: string;
  /** Timestamp written to DTSTAMP (injectable for tests). */
  now?: Date;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(text: string): Date {
  const match = DATE.exec(text);
  if (!match) throw new Error(`"${text}" is not a date like 2026-09-14`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape TEXT values (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets, without splitting multi-byte characters (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const max = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > max) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * Build an iCalendar file with one weekly recurring event per class meeting.
 * Times are "floating" (no time zone), so Google Calendar, Outlook and Apple
 * Calendar show them at the same clock time in the user's own zone.
 */
export function buildIcs(schedule: Schedule, options: IcsOptions): string {
  const start = parseDate(options.semesterStart);
  const end = parseDate(options.semesterEnd);
  if (end < start) throw new Error("the semester ends before it starts");
  const stamp = utcStamp(options.now ?? new Date());
  const until = `${ymd(end)}T235959`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//zafwr//Course Schedule Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(options.calendarName ?? "Class schedule")}`,
  ];

  for (const { course, section } of schedule) {
    for (const meeting of section.meetings) {
      // JS weekdays: Sun=0, Mon=1 … so DAYS index + 1.
      const weekday = DAYS.indexOf(meeting.day) + 1;
      const first = new Date(start);
      first.setUTCDate(first.getUTCDate() + ((weekday - first.getUTCDay() + 7) % 7));
      if (first > end) continue;

      const time = (t: string) => `${t.replace(":", "")}00`;
      const uid = `${course.code}-${section.id}-${meeting.day}-${meeting.start}`.replace(/[^A-Za-z0-9-]/g, "");
      const details = [`Section ${section.id}`, section.instructor].filter(Boolean).join(" · ");

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}-${ymd(start)}@course-schedule-planner`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${ymd(first)}T${time(meeting.start)}`,
        `DTEND:${ymd(first)}T${time(meeting.end)}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${until}`,
        `SUMMARY:${escapeText(`${course.code} ${course.name}`)}`,
        `DESCRIPTION:${escapeText(details)}`,
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
