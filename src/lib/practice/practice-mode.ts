import { isPracticeInterview, type PracticeInterviewLike } from "@/lib/practice/is-practice-interview";

export type PracticeMode = "mock" | "coach";

export const PRACTICE_MODES = ["mock", "coach"] as const;

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

export function buildPracticeCustomBranding(
  practiceMode: PracticeMode,
): Record<string, unknown> {
  return {
    isPractice: true,
    source: "practice",
    practiceMode,
  };
}
