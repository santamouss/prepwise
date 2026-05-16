export function hasSessionFeedback(session: {
  summary?: string | null;
  insights?: unknown;
}): boolean {
  if (session.summary?.trim()) return true;
  if (!session.insights || typeof session.insights !== "object") return false;

  const insights = session.insights as Record<string, unknown>;
  if (
    Array.isArray(insights.questionEvaluations) &&
    insights.questionEvaluations.length > 0
  ) {
    return true;
  }
  if (
    Array.isArray(insights.criteriaEvaluations) &&
    insights.criteriaEvaluations.length > 0
  ) {
    return true;
  }
  return false;
}
