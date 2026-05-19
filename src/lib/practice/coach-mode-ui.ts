import type { PracticeMode } from "@/lib/practice/practice-mode";

export type CoachUiPhase = "answering" | "coaching" | "waiting_for_choice";

export const COACH_UI_TITLE = "Coach Mode";
export const COACH_UI_SUBTITLE =
  "Answer one question at a time. Parker will coach you after each answer.";
export const COACH_UI_DONE_ANSWERING = "I'm done answering";
export const COACH_UI_TRY_AGAIN = "Try again";
export const COACH_UI_NEXT_QUESTION = "Next question";
export const COACH_UI_COACHING_STATUS = "Parker is coaching you…";

export const COACH_ANSWER_REQUIRED_MESSAGE =
  "Say your answer first, then click I'm done answering.";

export const COACH_RETRY_SYSTEM_PROMPT =
  "The candidate wants to retry the same question. Re-ask the current question and do not move forward. Do NOT call signal_question_change.";

export const COACH_ANSWER_DONE_SYSTEM_PROMPT =
  "The candidate clicked \"I'm done answering\" and has finished their answer. Give concise coach-style feedback now: quick X/10 when appropriate, one strength, one gap, one specific improvement, and a short example phrase (\"For example, you could say…\" or \"Try adding a sentence like…\") when useful — not a full model answer. Use STAR for behavioral gaps; user/observation/improvement/metric for product/case. If too short, say so and give a simple retry structure. End by telling them to use the on-screen Try again or Next question buttons (do not rely on voice commands). Do NOT call signal_question_change. Do NOT repeat the same coaching feedback twice.";

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

export function isCoachRetryPhrase(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return COACH_RETRY_PHRASES.some((pattern) => pattern.test(normalized));
}

/** Coach voice "next" must match the same strict navigation whitelist as the relay. */
export function isCoachNextPhrase(text: string): boolean {
  const normalized = text.trim();
  if (!normalized || isCoachRetryPhrase(normalized)) return false;
  // Lazy import avoided in client bundle — mirror relay whitelist with word-count cap.
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;
  const lower = normalized.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, " ").replace(/\s+/g, " ").trim();
  const exact = new Set([
    "next question",
    "move on",
    "skip",
    "skip this",
    "go next",
    "can we move on",
    "can we go to the next question",
    "lets move on",
    "let s move on",
  ]);
  return exact.has(lower);
}

export function shouldShowCoachControls(
  practiceMode: PracticeMode | undefined,
  preview: boolean,
): boolean {
  return practiceMode === "coach" && !preview;
}
