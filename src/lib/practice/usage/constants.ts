export const PRACTICE_SESSION_COMPLETED_EVENT = "practice_session_completed";

export type PracticePlanId = "free" | "starter" | "pro";

export const PRACTICE_PLAN_LIMITS: Record<PracticePlanId, number | null> = {
  free: 3,
  starter: 15,
  pro: null,
};

export const PRACTICE_LIMIT_EXCEEDED_MESSAGE =
  "You've used all your practice sessions for this month. Upgrade to continue practicing.";

export function normalizePracticePlan(value: string | null | undefined): PracticePlanId {
  if (value === "starter" || value === "pro") return value;
  return "free";
}

export function getPracticePlanLimit(plan: PracticePlanId): number | null {
  return PRACTICE_PLAN_LIMITS[plan];
}
