import { useState } from "react";
import { formatMeetings, parseMeetings } from "../core/time";
import type { Course, Meeting, Section } from "../core/types";
import { courseColor } from "./colors";

interface Props {
  courses: Course[];
  onChange: (courses: Course[]) => void;
  /** Called when the list structure changes, so inputs holding drafts are remounted. */
  onStructureChange: () => void;
}

/** Text box for meetings; keeps the draft while it is invalid and commits once it parses. */
function MeetingsInput({ meetings, onChange }: { meetings: Meeting[]; onChange: (m: Meeting[]) => void }) {
  const [draft, setDraft] = useState(() => formatMeetings(meetings));
  const [error, setError] = useState<string | null>(null);

  const update = (text: string) => {
    setDraft(text);
    if (!text.trim()) {
      setError(null);
      onChange([]);
      return;
    }
    try {
      onChange(parseMeetings(text));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="meetings">
      <input
        value={draft}
        onChange={(e) => update(e.target.value)}
        placeholder="Mon 09:30-11:20, Wed 13:30-14:20"
        aria-label="Meeting times"
        aria-invalid={error ? true : undefined}
        spellCheck={false}
      />
      {error && <p className="field-error">{error}</p>}
      {!error && meetings.length === 0 && <p className="field-hint">No meetings yet, so this section is skipped.</p>}
    </div>
  );
}

export function CourseEditor({ courses, onChange, onStructureChange }: Props) {
  const setCourse = (index: number, patch: Partial<Course>) =>
    onChange(courses.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const setSection = (ci: number, si: number, patch: Partial<Section>) =>
    setCourse(ci, { sections: courses[ci].sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });

  const addCourse = () => {
    onChange([...courses, { code: `NEW${courses.length + 1}`, name: "", sections: [{ id: "1", meetings: [] }] }]);
    onStructureChange();
  };

  const removeCourse = (index: number) => {
    onChange(courses.filter((_, i) => i !== index));
    onStructureChange();
  };

  const addSection = (ci: number) => {
    const ids = courses[ci].sections.map((s) => s.id);
    let n = ids.length + 1;
    while (ids.includes(String(n))) n++;
    setCourse(ci, { sections: [...courses[ci].sections, { id: String(n), meetings: [] }] });
  };

  const removeSection = (ci: number, si: number) => {
    const course = courses[ci];
    const removed = course.sections[si];
    setCourse(ci, {
      sections: course.sections.filter((_, i) => i !== si),
      pinnedSection: course.pinnedSection === removed.id ? undefined : course.pinnedSection,
    });
    onStructureChange();
  };

  return (
    <div className="course-list">
      {courses.map((course, ci) => (
        <article key={ci} className="course-card" style={{ "--course": courseColor(ci) } as React.CSSProperties}>
          <header className="course-head">
            <input
              className="course-code"
              value={course.code}
              onChange={(e) => setCourse(ci, { code: e.target.value.toUpperCase() })}
              aria-label="Course code"
            />
            <input
              className="course-name"
              value={course.name}
              onChange={(e) => setCourse(ci, { name: e.target.value })}
              placeholder="Course name"
              aria-label="Course name"
            />
            <button className="icon-btn" onClick={() => removeCourse(ci)} aria-label={`Remove ${course.code}`} title="Remove course">
              ×
            </button>
          </header>

          {course.sections.map((section, si) => {
            const pinned = course.pinnedSection === section.id;
            return (
              <div key={si} className={`section-row${section.excluded ? " is-excluded" : ""}${pinned ? " is-pinned" : ""}`}>
                <div className="section-line">
                  <label className="section-id">
                    <span>Sec</span>
                    <input value={section.id} onChange={(e) => setSection(ci, si, { id: e.target.value })} aria-label="Section id" />
                  </label>
                  <input
                    className="instructor"
                    value={section.instructor ?? ""}
                    onChange={(e) => setSection(ci, si, { instructor: e.target.value || undefined })}
                    placeholder="Instructor"
                    aria-label="Instructor"
                  />
                  <button
                    className={`chip${pinned ? " on" : ""}`}
                    onClick={() => setCourse(ci, { pinnedSection: pinned ? undefined : section.id })}
                    title="Only consider this section"
                    aria-pressed={pinned}
                  >
                    Pin
                  </button>
                  <button
                    className={`chip${section.excluded ? " on warn" : ""}`}
                    onClick={() => setSection(ci, si, { excluded: section.excluded ? undefined : true })}
                    title="Section is full: skip it"
                    aria-pressed={!!section.excluded}
                  >
                    Full
                  </button>
                  <button className="icon-btn small" onClick={() => removeSection(ci, si)} aria-label="Remove section" title="Remove section">
                    ×
                  </button>
                </div>
                <MeetingsInput meetings={section.meetings} onChange={(meetings) => setSection(ci, si, { meetings })} />
              </div>
            );
          })}
          <button className="link-btn" onClick={() => addSection(ci)}>
            + Add section
          </button>
        </article>
      ))}
      <button className="add-course" onClick={addCourse}>
        + Add course
      </button>
    </div>
  );
}
