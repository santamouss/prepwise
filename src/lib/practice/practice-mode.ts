import type { PracticeInterviewType } from "@/lib/practice/constants";
import { isPracticeInterview, type PracticeInterviewLike } from "@/lib/practice/is-practice-interview";

export type PracticeMode = "mock" | "coach";

export const PRACTICE_MODES = ["mock", "coach"] as const;

/** Default for new candidate practice on /practice (UI + practice.start). */
export const DEFAULT_CANDIDATE_PRACTICE_MODE: PracticeMode = "coach";

export function normalizePracticeMode(value: unknown): PracticeMode {
  return value === "coach" ? "coach" : "mock";
}

/**
 * Returns practice mode for candidate practice interviews.
 * Non-practice (recruiter) interviews always resolve to "mock" for voice prompt safety.
 */
export function getPracticeMode(interview: PracticeInterviewLike): PracticeMode {
  if (!isPracticeInterview(interview)) {
    return "mock";
  }

  const branding = interview.customBranding as
    | { practiceMode?: unknown }
    | null
    | undefined;

  return normalizePracticeMode(branding?.practiceMode);
}

export function getPracticeInterviewType(
  interview: PracticeInterviewLike,
): PracticeInterviewType | undefined {
  if (!isPracticeInterview(interview)) return undefined;
  const branding = interview.customBranding as
    | { practiceInterviewType?: unknown }
    | null
    | undefined;
  const raw = branding?.practiceInterviewType;
  if (
    raw === "BEHAVIORAL" ||
    raw === "ROLE_SPECIFIC" ||
    raw === "TECHNICAL" ||
    raw === "SALES" ||
    raw === "LEADERSHIP"
  ) {
    return raw;
  }
  return undefined;
}

export function buildPracticeCustomBranding(
  practiceMode: PracticeMode,
  practiceInterviewType?: PracticeInterviewType,
): Record<string, unknown> {
  return {
    isPractice: true,
    source: "practice",
    practiceMode,
    ...(practiceInterviewType ? { practiceInterviewType } : {}),
  };
}
