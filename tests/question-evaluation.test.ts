import assert from "node:assert/strict";
import test from "node:test";

import {
  inferQuestionStatus,
  normalizeQuestionEvaluationsForSession,
  type SessionReachContext,
} from "../src/lib/session/question-evaluation";
import { getSessionOverallScore } from "../src/lib/session-score";

function baseContext(
  overrides: Partial<SessionReachContext> = {},
): SessionReachContext {
  return {
    questions: [
      { id: "q1", text: "Tell me about yourself", order: 0 },
      { id: "q2", text: "Why this role?", order: 1 },
      { id: "q3", text: "Closing question", order: 2 },
    ],
    currentQuestionId: "q2",
    totalDurationSeconds: 600,
    timeLimitMinutes: 10,
    messages: [],
    ...overrides,
  };
}

test("not_reached question is excluded from overall score", () => {
  const context = baseContext({
    currentQuestionId: "q2",
    messages: [
      {
        role: "user",
        content: "I have ten years of experience leading teams and shipping products.",
        questionId: "q1",
      },
      {
        role: "user",
        content: "I am excited about the mission and the impact of this role.",
        questionId: "q2",
      },
    ],
  });

  const evaluations = normalizeQuestionEvaluationsForSession(
    [
      { question: "Tell me about yourself", score: 8, status: "answered" },
      { question: "Why this role?", score: 6, status: "answered" },
      { question: "Closing question", score: 1, status: "answered" },
    ],
    context,
  );

  const closing = evaluations.find((e) =>
    (e.question ?? "").includes("Closing"),
  );
  assert.equal(closing?.status, "not_reached");
  assert.equal(closing?.excludedFromScore, true);
  assert.equal(closing?.score, null);
  assert.equal(getSessionOverallScore({ questionEvaluations: evaluations }), 7);
});

test("answered questions still average correctly", () => {
  const context = baseContext({
    currentQuestionId: "q2",
    messages: [
      {
        role: "user",
        content: "One two three four five six seven eight",
        questionId: "q1",
      },
      {
        role: "user",
        content: "One two three four five six seven eight nine",
        questionId: "q2",
      },
    ],
  });

  const evaluations = normalizeQuestionEvaluationsForSession(
    [
      { question: "Tell me about yourself", score: 8 },
      { question: "Why this role?", score: 6 },
      { question: "Closing question", score: 2 },
    ],
    context,
  );

  assert.equal(getSessionOverallScore({ questionEvaluations: evaluations }), 7);
});

test("partial mid-answer is excluded from average", () => {
  const context = baseContext({
    currentQuestionId: "q2",
    totalDurationSeconds: 600,
    timeLimitMinutes: 10,
    messages: [
      {
        role: "user",
        content: "One two three four five six seven eight",
        questionId: "q1",
      },
      { role: "user", content: "uh maybe", questionId: "q2" },
    ],
  });

  const status = inferQuestionStatus(1, context);
  assert.equal(status, "partial");

  const evaluations = normalizeQuestionEvaluationsForSession(
    [{ question: "Why this role?", score: 3, status: "answered" }],
    context,
  );

  const partial = evaluations.find((e) =>
    (e.question ?? "").includes("Why"),
  );
  assert.equal(partial?.status, "partial");
  assert.equal(partial?.excludedFromScore, true);
});
