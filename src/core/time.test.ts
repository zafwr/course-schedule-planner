import { describe, expect, it } from "vitest";
import { formatDuration, formatMeetings, parseMeetings, toMinutes } from "./time";

describe("time helpers", () => {
  it("converts times to minutes", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("8.30")).toBe(510);
    expect(() => toMinutes("25:00")).toThrow();
    expect(() => toMinutes("noon")).toThrow();
  });

  it("formats durations", () => {
    expect(formatDuration(210)).toBe("3h 30m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(50)).toBe("50m");
  });
});

describe("parseMeetings", () => {
  it("parses catalog-style text", () => {
    expect(parseMeetings("Mon 09:30-11:20, Wed 13:30 – 14:20")).toEqual([
      { day: "Mon", start: "09:30", end: "11:20" },
      { day: "Wed", start: "13:30", end: "14:20" },
    ]);
  });

  it("accepts Turkish day names in any case", () => {
    const days = parseMeetings("Pzt 8:30-9:20; SALI 10:30-11:20\nÇarşamba 13:30-14:20; Per. 9:30-10:20; CUMA 15:30-16:20").map(
      (m) => m.day,
    );
    expect(days).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  });

  it("explains what is wrong", () => {
    expect(() => parseMeetings("")).toThrow(/at least one/);
    expect(() => parseMeetings("Funday 09:00-10:00")).toThrow(/not a day/);
    expect(() => parseMeetings("Mon 11:00-10:00")).toThrow(/ends before/);
    expect(() => parseMeetings("Mon 9-10")).toThrow(/should look like/);
  });

  it("round-trips through formatMeetings in weekly order", () => {
    const text = formatMeetings(parseMeetings("Wed 13:30-14:20, Mon 09:30-11:20"));
    expect(text).toBe("Mon 09:30-11:20, Wed 13:30-14:20");
  });
});
