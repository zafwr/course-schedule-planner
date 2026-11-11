import { sectionSlots } from "../core/solver";
import { formatTime } from "../core/time";
import { DAYS, WEEKDAYS, type Course, type Schedule } from "../core/types";
import { courseColor } from "./colors";

interface Props {
  schedule: Schedule;
  courses: Course[];
}

const HOUR_PX = 52;

export function WeekGrid({ schedule, courses }: Props) {
  const blocks = schedule.flatMap(({ course, section }) =>
    sectionSlots(section).map((slot) => ({ course, section, slot, color: courseColor(courses.indexOf(course)) })),
  );
  const days = blocks.some((b) => b.slot.day === "Sat") ? DAYS : WEEKDAYS;

  const first = Math.min(8 * 60, ...blocks.map((b) => b.slot.start));
  const last = Math.max(18 * 60, ...blocks.map((b) => b.slot.end));
  const startHour = Math.floor(first / 60);
  const endHour = Math.ceil(last / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = hours.length * HOUR_PX;
  const y = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR_PX;

  return (
    <div className="week" style={{ "--days": days.length } as React.CSSProperties}>
      <div className="week-head">
        <span />
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="week-body" style={{ height }}>
        <div className="hours">
          {hours.map((h) => (
            <span key={h} style={{ top: y(h * 60) }}>
              {formatTime(h * 60)}
            </span>
          ))}
        </div>
        {days.map((day) => {
          const dayBlocks = blocks.filter((b) => b.slot.day === day);
          return (
            <div key={day} className={`day${dayBlocks.length === 0 ? " is-free" : ""}`}>
              {hours.map((h) => (
                <span key={h} className="hour-line" style={{ top: y(h * 60) }} />
              ))}
              {dayBlocks.length === 0 && <span className="free-label">Free</span>}
              {dayBlocks.map(({ course, section, slot, color }) => (
                <div
                  key={`${course.code}-${slot.start}`}
                  className={`block${slot.end - slot.start < 60 ? " short" : ""}`}
                  style={{ top: y(slot.start), height: y(slot.end) - y(slot.start), "--course": color } as React.CSSProperties}
                  title={`${course.code} ${course.name} · Section ${section.id}${section.instructor ? ` · ${section.instructor}` : ""}`}
                >
                  <strong>{course.code}</strong>
                  <span className="block-time">
                    {formatTime(slot.start)}–{formatTime(slot.end)}
                  </span>
                  <span className="block-sec">Sec {section.id}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
