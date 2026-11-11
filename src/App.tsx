import { useEffect, useMemo, useRef, useState } from "react";
import { buildIcs } from "./core/ics";
import type { Plan } from "./core/plan";
import { rankSchedules } from "./core/scoring";
import { solve } from "./core/solver";
import { formatDuration, formatMeetings, formatTime } from "./core/time";
import { courseColor } from "./ui/colors";
import { CourseEditor } from "./ui/CourseEditor";
import { downloadFile, loadSavedPlan, readPlanFile, samplePlan, savePlan } from "./ui/files";
import { PreferencesPanel } from "./ui/PreferencesPanel";
import { WeekGrid } from "./ui/WeekGrid";

const SOLVE_LIMIT = 5000;
const SHOW_TOP = 50;

export default function App() {
  const [plan, setPlan] = useState<Plan>(loadSavedPlan);
  const [revision, setRevision] = useState(0);
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<"courses" | "prefs">("courses");
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => savePlan(plan), [plan]);

  const result = useMemo(() => solve(plan.courses, { limit: SOLVE_LIMIT }), [plan.courses]);
  const ranked = useMemo(() => rankSchedules(result.schedules, plan.preferences, SHOW_TOP), [result, plan.preferences]);

  useEffect(() => setIndex(0), [ranked]);
  const current = ranked[Math.min(index, ranked.length - 1)];

  // ← / → flip through schedules unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, ranked.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ranked.length]);

  const replacePlan = (next: Plan, message: string) => {
    setPlan(next);
    setRevision((r) => r + 1);
    setNotice(message);
  };

  const importPlan = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = await readPlanFile(file);
      replacePlan({ ...next, semester: next.semester.start ? next.semester : plan.semester }, `Imported ${file.name}`);
    } catch (e) {
      setNotice(`Import failed: ${(e as Error).message}`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const exportIcs = () => {
    if (!current) return;
    try {
      const ics = buildIcs(current.schedule, {
        semesterStart: plan.semester.start,
        semesterEnd: plan.semester.end,
        calendarName: "Class schedule",
      });
      downloadFile("class-schedule.ics", ics, "text/calendar;charset=utf-8");
      setNotice("Downloaded class-schedule.ics. Import it in Google Calendar under Settings → Import & export.");
    } catch (e) {
      setNotice(`Could not export: ${(e as Error).message}`);
    }
  };

  const total = result.truncated ? `${SOLVE_LIMIT.toLocaleString("en")}+` : result.schedules.length.toLocaleString("en");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Course Schedule Planner</h1>
          <p>Every clash-free timetable for your semester, ranked by how you like to study.</p>
        </div>
        <div className="top-actions">
          <button onClick={() => replacePlan(samplePlan(), "Loaded the demo semester")}>Demo semester</button>
          <button onClick={() => fileInput.current?.click()}>Import</button>
          <button
            onClick={() => downloadFile("schedule-plan.json", JSON.stringify(plan, null, 2), "application/json")}
            title="Save courses and preferences as JSON"
          >
            Export
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => importPlan(e.target.files?.[0])} />
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button className="icon-btn small" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <aside className="panel">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "courses"} onClick={() => setTab("courses")}>
              Courses <span className="count">{plan.courses.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "prefs"} onClick={() => setTab("prefs")}>
              Preferences
            </button>
          </div>
          {tab === "courses" ? (
            <>
              <p className="help">
                One card per course you must take. Type each section's times like <code>Mon 09:30-11:20, Wed 13:30-14:20</code>{" "}
                (Turkish day names work too). <b>Pin</b> a section you must be in, mark <b>Full</b> ones to skip them.
              </p>
              <CourseEditor
                key={revision}
                courses={plan.courses}
                onChange={(courses) => setPlan((p) => ({ ...p, courses }))}
                onStructureChange={() => setRevision((r) => r + 1)}
              />
            </>
          ) : (
            <PreferencesPanel value={plan.preferences} onChange={(preferences) => setPlan((p) => ({ ...p, preferences }))} />
          )}
        </aside>

        <section className="results" aria-live="polite">
          <div className="summary">
            <div>
              <span className="big">{total}</span> clash-free schedules
              <span className="muted">
                {" "}
                · {result.nodes.toLocaleString("en")} section choices explored
              </span>
            </div>
            {ranked.length > 0 && (
              <div className="pager">
                <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} aria-label="Previous schedule">
                  ←
                </button>
                <span>
                  Option <b>{index + 1}</b> of {ranked.length}
                </span>
                <button
                  onClick={() => setIndex((i) => Math.min(i + 1, ranked.length - 1))}
                  disabled={index >= ranked.length - 1}
                  aria-label="Next schedule"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {current ? (
            <div className="result-body">
              <WeekGrid schedule={current.schedule} courses={plan.courses} />

              <div className="details">
                <div className="card">
                  <h2>Why this rank</h2>
                  <ul className="score">
                    {current.items.length === 0 && <li className="muted">Matches every preference.</li>}
                    {current.items.map((item) => (
                      <li key={item.label}>
                        <span>{item.label}</span>
                        <span className={item.points < 0 ? "bonus" : "penalty"}>
                          {item.points > 0 ? "+" : ""}
                          {item.points}
                        </span>
                      </li>
                    ))}
                    <li className="score-total">
                      <span>Penalty (lower is better)</span>
                      <span>{current.penalty}</span>
                    </li>
                  </ul>
                  <dl className="stats">
                    <div>
                      <dt>Days on campus</dt>
                      <dd>{current.stats.daysOnCampus.length}</dd>
                    </div>
                    <div>
                      <dt>Gaps</dt>
                      <dd>{current.stats.gapMinutes ? formatDuration(current.stats.gapMinutes) : "None"}</dd>
                    </div>
                    <div>
                      <dt>Earliest</dt>
                      <dd>{current.stats.earliestStart !== null ? formatTime(current.stats.earliestStart) : "–"}</dd>
                    </div>
                    <div>
                      <dt>Latest</dt>
                      <dd>{current.stats.latestEnd !== null ? formatTime(current.stats.latestEnd) : "–"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card">
                  <h2>Sections to register</h2>
                  <ul className="picks">
                    {current.schedule.map(({ course, section }) => (
                      <li key={course.code} style={{ "--course": courseColor(plan.courses.indexOf(course)) } as React.CSSProperties}>
                        <span className="pick-code">
                          {course.code}.{section.id}
                        </span>
                        <span className="pick-name">
                          {course.name}
                          {section.instructor && <small>{section.instructor}</small>}
                        </span>
                        <span className="pick-times">{formatMeetings(section.meetings)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card">
                  <h2>Add to calendar</h2>
                  <div className="pref-grid">
                    <label>
                      <span>Classes start</span>
                      <input
                        type="date"
                        value={plan.semester.start}
                        onChange={(e) => setPlan((p) => ({ ...p, semester: { ...p.semester, start: e.target.value } }))}
                      />
                    </label>
                    <label>
                      <span>Classes end</span>
                      <input
                        type="date"
                        value={plan.semester.end}
                        onChange={(e) => setPlan((p) => ({ ...p, semester: { ...p.semester, end: e.target.value } }))}
                      />
                    </label>
                  </div>
                  <button className="primary" onClick={exportIcs} disabled={!plan.semester.start || !plan.semester.end}>
                    Download .ics
                  </button>
                  <p className="field-hint">Weekly events for the whole semester. Works with Google Calendar, Outlook and Apple Calendar.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty card">
              <h2>No schedule fits</h2>
              {plan.courses.length === 0 && <p>Add the courses you want to take to get started.</p>}
              {result.emptyCourses.length > 0 && (
                <p>
                  {result.emptyCourses.join(", ")} {result.emptyCourses.length === 1 ? "has" : "have"} no usable section (all marked full,
                  pinned to a missing section, or without meeting times).
                </p>
              )}
              {result.impossiblePairs.map(([a, b]) => (
                <p key={a + b}>
                  Every section of <b>{a}</b> clashes with every section of <b>{b}</b>. You cannot take both this semester.
                </p>
              ))}
              {plan.courses.length > 0 && result.emptyCourses.length === 0 && result.impossiblePairs.length === 0 && (
                <p>Each pair of courses can be combined, but not all of them at once. Try unpinning a section or dropping a course.</p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="foot">
        Runs entirely in your browser; nothing is uploaded. ← / → to flip through options.{" "}
        <a href="https://github.com/zafwr/course-schedule-planner">Source on GitHub</a>
      </footer>
    </div>
  );
}
