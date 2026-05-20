import type { PracticeDuration, PracticeInterviewType } from "@/lib/practice/constants";
import type { PracticeMode } from "@/lib/practice/practice-mode";

/** sessionStorage key for practice setup saved before auth */
export const PENDING_PRACTICE_FORM_STORAGE_KEY = "parker_practice_intent";

const LEGACY_PENDING_PRACTICE_FORM_STORAGE_KEY = "parkerhero:pending-practice-form";

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

function readPendingPracticeFormRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PRACTICE_FORM_STORAGE_KEY);
    if (raw) return raw;
    const legacy = sessionStorage.getItem(LEGACY_PENDING_PRACTICE_FORM_STORAGE_KEY);
    if (legacy) {
      sessionStorage.setItem(PENDING_PRACTICE_FORM_STORAGE_KEY, legacy);
      sessionStorage.removeItem(LEGACY_PENDING_PRACTICE_FORM_STORAGE_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadPendingPracticeForm(): PendingPracticeForm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readPendingPracticeFormRaw();
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

/** Query params for login/register when returning to practice after auth */
export function buildPracticeAuthQueryParams(): URLSearchParams {
  return new URLSearchParams({
    next: "/practice",
    redirect: "/practice",
    autoStart: "true",
  });
}

export function buildPracticeLoginUrl(): string {
  return `/login?${buildPracticeAuthQueryParams().toString()}`;
}

export function buildPracticeRegisterUrl(): string {
  return `/register?${buildPracticeAuthQueryParams().toString()}`;
}
