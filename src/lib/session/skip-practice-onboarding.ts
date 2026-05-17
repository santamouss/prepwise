import { isPracticeInterview, type PracticeInterviewLike } from "@/lib/practice/is-practice-interview";

export type SkipPracticeOnboardingInput = {
  isPreview?: boolean;
};

/**
 * Candidate practice from the dashboard should enter the live session directly.
 * Recruiter preview, invite links, proctoring, and video interviews keep onboarding.
 */
export function shouldSkipCandidatePracticeOnboarding(
  interview: PracticeInterviewLike & {
    antiCheatingEnabled?: boolean | null;
    videoEnabled?: boolean | null;
  },
  options: SkipPracticeOnboardingInput = {},
): boolean {
  if (options.isPreview) return false;
  if (!isPracticeInterview(interview)) return false;
  if (interview.antiCheatingEnabled) return false;
  if (interview.videoEnabled) return false;
  return true;
}
