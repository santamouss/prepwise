export type PracticeInterviewLike = {
  isPractice?: boolean | null;
  customBranding?: unknown;
};

export function isPracticeInterview(interview: PracticeInterviewLike): boolean {
  if (interview.isPractice === true) return true;
  if (interview.isPractice === false) return false;

  const branding = interview.customBranding as
    | { isPractice?: boolean; source?: string }
    | null
    | undefined;

  return branding?.isPractice === true || branding?.source === "practice";
}
