import type { PracticeDuration, PracticeInterviewType } from "@/lib/practice/constants";
import type { PracticeMode } from "@/lib/practice/practice-mode";

export const PENDING_PRACTICE_FORM_STORAGE_KEY = "parkerhero:pending-practice-form";

export type PendingPracticeForm = {
  role: string;
  company?: string;
  jobDescription?: string;
  jobDescriptionUrl?: string;
  resumeText?: string;
  resumeFileName?: string;
  interviewType: PracticeInterviewType;
  durationMinutes: PracticeDuration;
  practiceMode: PracticeMode;
};

const INTERVIEW_TYPES: PracticeInterviewType[] = [
  "BEHAVIORAL",
  "ROLE_SPECIFIC",
  "TECHNICAL",
  "SALES",
  "LEADERSHIP",
];

const DURATIONS: PracticeDuration[] = [5, 10, 15];
const MODES: PracticeMode[] = ["mock", "coach"];

function isPendingPracticeForm(value: unknown): value is PendingPracticeForm {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.role === "string" &&
    v.role.trim().length > 0 &&
    INTERVIEW_TYPES.includes(v.interviewType as PracticeInterviewType) &&
    DURATIONS.includes(v.durationMinutes as PracticeDuration) &&
    MODES.includes(v.practiceMode as PracticeMode)
  );
}

export function savePendingPracticeForm(form: PendingPracticeForm): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_PRACTICE_FORM_STORAGE_KEY, JSON.stringify(form));
  } catch {
    /* quota / private mode */
  }
}

export function loadPendingPracticeForm(): PendingPracticeForm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PRACTICE_FORM_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPendingPracticeForm(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingPracticeForm(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PRACTICE_FORM_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function hasPendingPracticeForm(): boolean {
  return loadPendingPracticeForm() !== null;
}

export function buildPracticeLoginUrl(): string {
  const params = new URLSearchParams({
    redirect: "/practice",
    autoStart: "true",
  });
  return `/login?${params.toString()}`;
}
