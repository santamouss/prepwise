export type SessionFeedbackFields = {
  summary?: string | null;
  themes?: string[] | null;
  insights?: unknown;
};

function nonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function insightsRecord(insights: unknown): Record<string, unknown> | null {
  if (!insights || typeof insights !== "object" || Array.isArray(insights)) {
    return null;
  }
  return insights as Record<string, unknown>;
}

/** Matches report detection used in InterviewResults. */
export function hasSessionFeedback(session: SessionFeedbackFields): boolean {
  if (session.summary?.trim()) return true;

  if (nonEmptyArray(session.themes)) return true;

  const insights = session.insights;
  if (Array.isArray(insights) && insights.length > 0) return true;

  const record = insightsRecord(insights);
  if (!record) return false;

  if (nonEmptyArray(record.questionEvaluations)) return true;
  if (nonEmptyArray(record.criteriaEvaluations)) return true;
  if (nonEmptyArray(record.researchFindings)) return true;
  if (nonEmptyArray(record.keyInsights)) return true;

  if (record.toneAnalysis && typeof record.toneAnalysis === "object") {
    return true;
  }

  return false;
}
