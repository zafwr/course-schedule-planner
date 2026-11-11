import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "./ics";
import { parseMeetings } from "./time";
import type { Schedule } from "./types";

const schedule: Schedule = [
  {
    course: { code: "CS301", name: "Algorithms, Part I", sections: [] },
    section: { id: "2", instructor: "Dr. Example", meetings: parseMeetings("Mon 09:30-11:20, Thu 13:30-14:20") },
  },
];

const ics = buildIcs(schedule, {
  semesterStart: "2026-09-16", // a Wednesday
  semesterEnd: "2027-01-08",
  now: new Date("2026-09-01T12:00:00Z"),
});

describe("buildIcs", () => {
  it("creates one weekly event per meeting, starting on the first matching weekday", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20260917T133000"); // Thu after Wed 16 Sep
    expect(ics).toContain("DTSTART:20260921T093000"); // following Monday
    expect(ics).toContain("DTEND:20260921T112000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;UNTIL=20270108T235959");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
  });

  it("escapes text and uses CRLF line endings", () => {
    expect(ics).toContain("SUMMARY:CS301 Algorithms\\, Part I");
    expect(ics).toContain("DESCRIPTION:Section 2 · Dr. Example");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("rejects an inverted semester", () => {
    expect(() => buildIcs(schedule, { semesterStart: "2027-01-08", semesterEnd: "2026-09-16" })).toThrow();
  });
});

describe("helpers", () => {
  it("escapes special characters", () => {
    expect(escapeText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  it("folds long lines at 75 octets without breaking characters", () => {
    const line = "SUMMARY:" + "Çok uzun ders adı ".repeat(10);
    const folded = foldLine(line).split("\r\n");
    const encoder = new TextEncoder();
    expect(folded.length).toBeGreaterThan(1);
    folded.forEach((part) => expect(encoder.encode(part).length).toBeLessThanOrEqual(75));
    expect(folded.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});
