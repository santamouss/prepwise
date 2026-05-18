import {
  getScorableQuestionEvaluations,
  normalizeEvaluationStatus,
  type QuestionEvaluationRecord,
  type SessionScoreInsights,
} from "@/lib/session/question-evaluation";

export type { SessionScoreInsights };

type ScoreEntry = { score?: number | string | null; status?: string | null; excludedFromScore?: boolean } | null | undefined;

function parseScore(entry: ScoreEntry): number | null {
  if (!entry || entry.score == null) return null;
  const status = normalizeEvaluationStatus(entry.status);
  if (status && (status === "not_reached" || status === "timed_out")) {
    return null;
  }
  if (entry.excludedFromScore === true) return null;
  const value =
    typeof entry.score === "number" ? entry.score : Number(entry.score);
  return Number.isFinite(value) ? value : null;
}

function averageScore(entries: ScoreEntry[] | null | undefined): number | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const scores = entries
    .map((entry) => parseScore(entry))
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function getSessionOverallScore(
  insights: SessionScoreInsights,
): number | null {
  const evaluations = insights?.questionEvaluations as
    | QuestionEvaluationRecord[]
    | null
    | undefined;
  const scorable = getScorableQuestionEvaluations(evaluations);
  const questionScore = averageScore(scorable);
  if (questionScore !== null) return questionScore;
  return averageScore(insights?.criteriaEvaluations);
}

export function usesQuestionEvaluationScore(
  insights: SessionScoreInsights,
): boolean {
  const evaluations = insights?.questionEvaluations as
    | QuestionEvaluationRecord[]
    | null
    | undefined;
  return averageScore(getScorableQuestionEvaluations(evaluations)) !== null;
}

export function countScorableQuestions(
  insights: SessionScoreInsights,
): number {
  return getScorableQuestionEvaluations(
    insights?.questionEvaluations as QuestionEvaluationRecord[] | null,
  ).length;
}
