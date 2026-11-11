import { DAYS, type Day, type Meeting } from "./types";

export class ParseError extends Error {}

const TIME = /^(\d{1,2})[:.](\d{2})$/;

/** "09:30" -> 570 */
export function toMinutes(time: string): number {
  const match = TIME.exec(time.trim());
  if (!match) throw new ParseError(`"${time}" is not a time like 09:30`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new ParseError(`"${time}" is not a valid time`);
  return hours * 60 + minutes;
}

/** 570 -> "09:30" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 210 -> "3h 30m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

// English and Turkish day names, since university systems export either.
const DAY_ALIASES: Record<string, Day> = {
  mon: "Mon", monday: "Mon", pzt: "Mon", pazartesi: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue", sal: "Tue", sali: "Tue", "salı": "Tue",
  wed: "Wed", wednesday: "Wed", car: "Wed", "çar": "Wed", carsamba: "Wed", "çarşamba": "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu", per: "Thu", persembe: "Thu", "perşembe": "Thu",
  fri: "Fri", friday: "Fri", cum: "Fri", cuma: "Fri",
  sat: "Sat", saturday: "Sat", cmt: "Sat", cumartesi: "Sat",
};

export function parseDay(text: string): Day {
  const key = text.trim().replace(/\.$/, "").toLowerCase().replace(/\u0307/g, ""); // "İ" lowercases to i + combining dot
  const day = DAY_ALIASES[key];
  if (!day) throw new ParseError(`"${text}" is not a day (try Mon, Tue, … or Pzt, Sal, …)`);
  return day;
}

const MEETING = /^(\S+)\s+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})$/;

/**
 * Parse meetings written the way they appear on a course catalog:
 * "Mon 09:30-11:20, Wed 13:30-14:20" (also accepts ";" or new lines and Turkish day names).
 */
export function parseMeetings(text: string): Meeting[] {
  const parts = text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new ParseError("add at least one meeting, e.g. Mon 09:30-11:20");
  return parts.map((part) => {
    const match = MEETING.exec(part);
    if (!match) throw new ParseError(`"${part}" should look like Mon 09:30-11:20`);
    const day = parseDay(match[1]);
    const start = toMinutes(match[2]);
    const end = toMinutes(match[3]);
    if (end <= start) throw new ParseError(`"${part}" ends before it starts`);
    return { day, start: formatTime(start), end: formatTime(end) };
  });
}

export function formatMeetings(meetings: Meeting[]): string {
  return [...meetings]
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMinutes(a.start) - toMinutes(b.start))
    .map((m) => `${m.day} ${m.start}-${m.end}`)
    .join(", ");
}
