import type { PracticeMode } from "@/lib/practice/practice-mode";

export type CoachUiPhase = "answering" | "coaching" | "waiting_for_choice";

export const COACH_ANSWER_REQUIRED_MESSAGE =
  "Say your answer first, then click I'm done answering.";

export const COACH_RETRY_SYSTEM_PROMPT =
  "The candidate wants to retry the same question. Re-ask the current question and do not move forward. Do NOT call signal_question_change.";

export const COACH_ANSWER_DONE_SYSTEM_PROMPT =
  "The candidate clicked \"I'm done answering\" and has finished their answer. Give concise coaching now (one strength, one gap, one concrete improvement). Do NOT call signal_question_change. Do NOT ask whether to retry or move on — the UI shows Try Again and Next Question buttons.";

export function isCoachModePractice(practiceMode?: PracticeMode): boolean {
  return practiceMode === "coach";
}

export function getLatestUserAnswerText(
  liveTranscript: string,
  messages: Array<{ role: string; content: string }>,
): string {
  const live = liveTranscript.trim();
  if (live) return live;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "user" && message.content.trim()) {
      return message.content.trim();
    }
  }
  return "";
}

export function hasCoachAnswerContent(
  liveTranscript: string,
  messages: Array<{ role: string; content: string }>,
  minChars = 12,
  minWords = 2,
): boolean {
  const text = getLatestUserAnswerText(liveTranscript, messages);
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  return text.length >= minChars && words >= minWords;
}

const COACH_RETRY_PHRASES = [
  /\btry again\b/i,
  /\blet me try\b/i,
  /\bretry\b/i,
  /\bone more time\b/i,
  /\bdo it again\b/i,
];

const COACH_NEXT_PHRASES = [
  /\bnext question\b/i,
  /\bmove on\b/i,
  /\bskip\b/i,
  /\bcontinue\b/i,
  /\bgo to the next\b/i,
];

export function isCoachRetryPhrase(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return COACH_RETRY_PHRASES.some((pattern) => pattern.test(normalized));
}

export function isCoachNextPhrase(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  if (isCoachRetryPhrase(normalized)) return false;
  return COACH_NEXT_PHRASES.some((pattern) => pattern.test(normalized));
}

export function shouldShowCoachControls(
  practiceMode: PracticeMode | undefined,
  preview: boolean,
): boolean {
  return isCoachModePractice(practiceMode) && !preview;
}
