import type { Preferences } from "../core/scoring";
import { WEEKDAYS } from "../core/types";

interface Props {
  value: Preferences;
  onChange: (prefs: Preferences) => void;
}

const START_OPTIONS = ["08:30", "09:30", "10:30", "11:30"];
const END_OPTIONS = ["15:30", "16:30", "17:30", "18:30"];

export function PreferencesPanel({ value, onChange }: Props) {
  const set = (patch: Partial<Preferences>) => onChange({ ...value, ...patch });

  return (
    <div className="prefs">
      <div className="pref-grid">
        <label>
          <span>No classes before</span>
          <select value={value.noClassesBefore ?? ""} onChange={(e) => set({ noClassesBefore: e.target.value || null })}>
            <option value="">Any time</option>
            {START_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Done by</span>
          <select value={value.noClassesAfter ?? ""} onChange={(e) => set({ noClassesAfter: e.target.value || null })}>
            <option value="">Any time</option>
            {END_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="free-days">
        <legend>Keep these days free</legend>
        {WEEKDAYS.map((day) => {
          const on = value.freeDays.includes(day);
          return (
            <button
              key={day}
              className={`chip${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => set({ freeDays: on ? value.freeDays.filter((d) => d !== day) : [...value.freeDays, day] })}
            >
              {day}
            </button>
          );
        })}
      </fieldset>

      <label className="check">
        <input type="checkbox" checked={value.compactWeek} onChange={(e) => set({ compactWeek: e.target.checked })} />
        <span>As many free weekdays as possible</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={value.minimizeGaps} onChange={(e) => set({ minimizeGaps: e.target.checked })} />
        <span>Fewer gaps between classes</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={value.lunchBreak} onChange={(e) => set({ lunchBreak: e.target.checked })} />
        <span>Keep a lunch break (30 min, 11:30–13:30)</span>
      </label>

      <label className="stacked">
        <span>Avoid instructors</span>
        <input
          value={value.avoidInstructors.join(", ")}
          onChange={(e) => set({ avoidInstructors: e.target.value.split(",").map((s) => s.trimStart()) })}
          placeholder="Comma-separated names"
        />
      </label>
    </div>
  );
}
