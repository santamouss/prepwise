import type { PostInterviewRedirectPlan } from "@/lib/session/post-interview-redirect";

export type CompletionPhase =
  | "processing"
  | "feedback-pending"
  | "thank-you"
  | "redirecting";

export type CompletionFlowBranch = "thank-you" | "feedback-poll";

const TERMINAL_PHASES: CompletionPhase[] = [
  "thank-you",
  "feedback-pending",
  "redirecting",
];

export function lockCompletionFlowBranch(
  current: CompletionFlowBranch | null,
  planThankYouOnly: boolean,
): CompletionFlowBranch {
  if (current === "thank-you") return "thank-you";
  if (current === "feedback-poll") return "feedback-poll";
  return planThankYouOnly ? "thank-you" : "feedback-poll";
}

export function applyThankYouLockToPlan(
  plan: PostInterviewRedirectPlan,
): PostInterviewRedirectPlan {
  return {
    ...plan,
    thankYouOnly: true,
    redirectPath: null,
  };
}

export function isTerminalCompletionPhase(phase: CompletionPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

export function coerceCompletionPhase(
  current: CompletionPhase,
  next: CompletionPhase,
): CompletionPhase {
  if (isTerminalCompletionPhase(current)) return current;
  return next;
}

export function completionPhaseStorageKey(sessionId: string): string {
  return `parker:completion-phase:${sessionId}`;
}

export function readPersistedCompletionPhase(
  sessionId: string,
): CompletionPhase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(completionPhaseStorageKey(sessionId));
    if (
      raw === "thank-you" ||
      raw === "feedback-pending" ||
      raw === "redirecting"
    ) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function persistCompletionPhase(
  sessionId: string,
  phase: CompletionPhase,
): void {
  if (typeof window === "undefined" || !isTerminalCompletionPhase(phase)) {
    return;
  }
  try {
    sessionStorage.setItem(completionPhaseStorageKey(sessionId), phase);
  } catch {
    // ignore storage errors
  }
}

export function buildCompletionRunKey(
  sessionId: string,
  branch: CompletionFlowBranch,
): string {
  return `${sessionId}:${branch}`;
}

/** Whether a new async completion run should start for this runKey. */
export function shouldStartCompletionRun(
  completedRunKey: string | null,
  activeRunKey: string | null,
  runKey: string,
): boolean {
  if (completedRunKey === runKey) return false;
  if (activeRunKey === runKey) return false;
  return true;
}

export function markCompletionRunCompleted(
  runKey: string,
): string {
  return runKey;
}

/**
 * Clears the active run when cleanup cancels before a terminal phase,
 * allowing the same runKey to start again.
 */
export function releaseActiveCompletionRunOnCancel(
  activeRunKey: string | null,
  runKey: string,
  phase: CompletionPhase,
): string | null {
  if (activeRunKey !== runKey) return activeRunKey;
  if (isTerminalCompletionPhase(phase)) return activeRunKey;
  return null;
}

/** Resolves the terminal phase after feedback polling finishes or times out. */
export function resolveFeedbackPollTerminalPhase(input: {
  saveOk: boolean;
  feedbackReady: boolean;
  redirectPath: string | null;
}): CompletionPhase {
  if (!input.saveOk || !input.feedbackReady) {
    return "feedback-pending";
  }
  if (input.redirectPath) {
    return "redirecting";
  }
  return "thank-you";
}
