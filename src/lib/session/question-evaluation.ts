/**
 * Question evaluation reach/scoring helpers for session reports.
 */

export type QuestionEvaluationStatus =
  | "answered"
  | "partial"
  | "skipped"
  | "timed_out"
  | "not_reached";

export type QuestionEvaluationRecord = {
  question?: string;
  score?: number | string | null;
  evaluation?: string;
  highlights?: string[];
  improvements?: string[];
  status?: QuestionEvaluationStatus | string | null;
  excludedFromScore?: boolean;
};

export type InterviewQuestionRef = {
  id: string;
  text: string;
  order: number;
};

export type SessionMessageRef = {
  role: string;
  content: string;
  questionId?: string | null;
};

export type SessionReachContext = {
  questions: InterviewQuestionRef[];
  currentQuestionId: string | null;
  totalDurationSeconds: number | null;
  timeLimitMinutes: number | null;
  messages: SessionMessageRef[];
  /** Highest question index the session advanced to (from progress saves). */
  lastQuestionIndex?: number | null;
};

const MIN_SUBSTANTIVE_ANSWER_WORDS = 8;

export function normalizeEvaluationStatus(
  raw: string | null | undefined,
): QuestionEvaluationStatus | null {
  if (!raw) return null;
  const value = raw.toLowerCase().replace(/-/g, "_");
  if (
    value === "answered" ||
    value === "partial" ||
    value === "skipped" ||
    value === "timed_out" ||
    value === "not_reached"
  ) {
    return value;
  }
  if (value === "not reached" || value === "notreached") {
    return "not_reached";
  }
  if (value === "timed out" || value === "timeout") {
    return "timed_out";
  }
  return null;
}

export function isScorableQuestionStatus(
  status: QuestionEvaluationStatus | null | undefined,
): boolean {
  if (!status) return true;
  return status === "answered" || status === "skipped";
}

export type SessionScoreInsights =
  | {
      questionEvaluations?: QuestionEvaluationRecord[] | null;
      criteriaEvaluations?: { score?: number | string | null }[] | null;
    }
  | null
  | undefined;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function sessionEndedByTimer(context: SessionReachContext): boolean {
  const limitMinutes = context.timeLimitMinutes;
  const duration = context.totalDurationSeconds;
  if (!limitMinutes || limitMinutes <= 0 || duration == null) return false;
  return duration >= limitMinutes * 60 * 0.92;
}

export function indexForQuestionId(
  questions: InterviewQuestionRef[],
  questionId: string | null | undefined,
): number | null {
  if (!questionId) return null;
  const idx = questions.findIndex((q) => q.id === questionId);
  return idx >= 0 ? idx : null;
}

export function highestQuestionIndexFromMessages(
  questions: InterviewQuestionRef[],
  messages: SessionMessageRef[],
): number {
  const idToIndex = new Map(questions.map((q, i) => [q.id, i]));
  let max = -1;
  for (const message of messages) {
    if (message.role.toLowerCase() !== "user") continue;
    const idx = message.questionId ? idToIndex.get(message.questionId) : undefined;
    if (typeof idx === "number" && idx > max) max = idx;
  }
  return max;
}

export function inferActiveQuestionIndex(context: SessionReachContext): number {
  const sorted = [...context.questions].sort((a, b) => a.order - b.order);
  const fromId = indexForQuestionId(sorted, context.currentQuestionId);
  const fromProgress =
    typeof context.lastQuestionIndex === "number"
      ? context.lastQuestionIndex
      : -1;
  const fromMessages = highestQuestionIndexFromMessages(sorted, context.messages);
  return Math.max(fromId ?? -1, fromProgress, fromMessages);
}

function userWordCountForQuestion(
  messages: SessionMessageRef[],
  questionId: string,
): number {
  return messages
    .filter(
      (m) =>
        m.role.toLowerCase() === "user" &&
        m.questionId === questionId &&
        m.content.trim(),
    )
    .reduce((sum, m) => sum + countWords(m.content), 0);
}

function matchEvaluationToQuestion(
  evaluation: QuestionEvaluationRecord,
  question: InterviewQuestionRef,
): boolean {
  const evalQ = evaluation.question?.trim().toLowerCase() ?? "";
  const qText = question.text?.trim().toLowerCase() ?? "";
  if (!evalQ || !qText) return false;
  return evalQ === qText || evalQ.includes(qText) || qText.includes(evalQ);
}

/**
 * Infer per-question status from session progress and transcript.
 */
export function inferQuestionStatus(
  questionIndex: number,
  context: SessionReachContext,
): QuestionEvaluationStatus {
  const sorted = [...context.questions].sort((a, b) => a.order - b.order);
  const question = sorted[questionIndex];
  if (!question) return "not_reached";

  const activeIndex = inferActiveQuestionIndex(context);
  const endedByTimer = sessionEndedByTimer(context);
  const userWords = userWordCountForQuestion(context.messages, question.id);

  if (questionIndex > activeIndex) {
    return "not_reached";
  }

  if (questionIndex < activeIndex) {
    return userWords >= MIN_SUBSTANTIVE_ANSWER_WORDS ? "answered" : "partial";
  }

  // Last active question
  if (userWords >= MIN_SUBSTANTIVE_ANSWER_WORDS) {
    return "answered";
  }
  if (userWords > 0) {
    return "partial";
  }
  if (endedByTimer) {
    return "timed_out";
  }
  return "not_reached";
}

export function applyReachStatusToEvaluation(
  evaluation: QuestionEvaluationRecord,
  status: QuestionEvaluationStatus,
): QuestionEvaluationRecord {
  const excludedFromScore = !isScorableQuestionStatus(status);
  const base: QuestionEvaluationRecord = {
    ...evaluation,
    status,
    excludedFromScore,
  };

  if (status === "not_reached") {
    return {
      ...base,
      score: null,
      evaluation:
        evaluation.evaluation?.trim() ||
        "The session ended before this question was reached.",
      highlights: [],
      improvements: [],
    };
  }

  if (status === "timed_out") {
    return {
      ...base,
      score: null,
      evaluation:
        evaluation.evaluation?.trim() ||
        "Time ran out before this question could be completed.",
      highlights: evaluation.highlights ?? [],
      improvements: evaluation.improvements ?? [],
    };
  }

  if (status === "partial" && excludedFromScore) {
    return {
      ...base,
      score: null,
    };
  }

  return base;
}

/**
 * Merge AI evaluations with all interview questions; apply reach-based statuses.
 */
export function normalizeQuestionEvaluationsForSession(
  evaluations: QuestionEvaluationRecord[],
  context: SessionReachContext,
): QuestionEvaluationRecord[] {
  const sorted = [...context.questions].sort((a, b) => a.order - b.order);
  const used = new Set<number>();

  const merged = sorted.map((question, index) => {
    const matchIdx = evaluations.findIndex(
      (evaluation, evalIndex) =>
        !used.has(evalIndex) && matchEvaluationToQuestion(evaluation, question),
    );
    const matched =
      matchIdx >= 0 ? evaluations[matchIdx] : ({} as QuestionEvaluationRecord);
    if (matchIdx >= 0) used.add(matchIdx);

    const aiStatus = normalizeEvaluationStatus(matched.status);
    const inferred = inferQuestionStatus(index, context);
    const status = !isScorableQuestionStatus(inferred)
      ? inferred
      : aiStatus && isScorableQuestionStatus(aiStatus)
        ? aiStatus
        : inferred;

    return applyReachStatusToEvaluation(
      {
        question: question.text,
        score: matched.score,
        evaluation: matched.evaluation,
        highlights: matched.highlights,
        improvements: matched.improvements,
      },
      status,
    );
  });

  return merged;
}

export function getScorableQuestionEvaluations(
  evaluations: QuestionEvaluationRecord[] | null | undefined,
): QuestionEvaluationRecord[] {
  if (!Array.isArray(evaluations)) return [];
  return evaluations.filter((entry) => {
    const status = normalizeEvaluationStatus(entry.status);
    if (status) return isScorableQuestionStatus(status);
    if (entry.excludedFromScore === true) return false;
    return entry.score != null && entry.score !== "";
  });
}

export function statusDisplayLabel(
  status: QuestionEvaluationStatus | null,
): string {
  switch (status) {
    case "not_reached":
      return "Not reached — excluded from score";
    case "timed_out":
      return "Not completed — excluded from score";
    case "partial":
      return "Partial";
    case "skipped":
      return "Skipped";
    case "answered":
      return "Answered";
    default:
      return "";
  }
}
