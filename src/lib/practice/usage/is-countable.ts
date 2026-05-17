export type PracticeSessionCountInput = {
  status: string;
  isPracticeInterview: boolean;
  totalDurationSeconds: number | null;
  userMessageCount: number;
};

/**
 * A completed candidate practice session counts toward monthly usage when:
 * - status is COMPLETED
 * - interview is a practice interview
 * - at least one USER message OR duration >= 120s
 * - not a sub-60s session with zero user responses (mic test / abandon)
 */
export function isCountablePracticeSession(input: PracticeSessionCountInput): boolean {
  if (input.status !== "COMPLETED") return false;
  if (!input.isPracticeInterview) return false;

  const duration = input.totalDurationSeconds ?? 0;
  const userMessages = input.userMessageCount;

  if (userMessages > 0) return true;
  if (duration >= 120) return true;
  return false;
}
