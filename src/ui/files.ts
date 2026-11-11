import { parsePlan, type Plan } from "../core/plan";
import { DEFAULT_PREFERENCES } from "../core/scoring";
import { SAMPLE_COURSES, SAMPLE_SEMESTER } from "../core/sample";

const STORAGE_KEY = "course-schedule-planner.plan.v1";

export function samplePlan(): Plan {
  return {
    version: 1,
    courses: structuredClone(SAMPLE_COURSES),
    preferences: { ...DEFAULT_PREFERENCES },
    semester: { ...SAMPLE_SEMESTER },
  };
}

/** Last saved plan, or the demo semester. Storage can be unavailable (private mode), so failures are ignored. */
export function loadSavedPlan(): Plan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parsePlan(JSON.parse(raw));
  } catch {
    /* fall back to the sample */
  }
  return samplePlan();
}

export function savePlan(plan: Plan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* not critical */
  }
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readPlanFile(file: File): Promise<Plan> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(`${file.name} is not valid JSON`);
  }
  return parsePlan(data);
}
