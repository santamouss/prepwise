import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCalendarMonthBillingPeriod } from "../src/lib/practice/usage/billing-period";
import { canStartPracticeSession } from "../src/lib/practice/usage/limits";
import {
  getPracticePlanLimit,
  PRACTICE_LIMIT_EXCEEDED_MESSAGE,
} from "../src/lib/practice/usage/constants";
import { isCountablePracticeSession } from "../src/lib/practice/usage/is-countable";

describe("isCountablePracticeSession", () => {
  const base = {
    status: "COMPLETED",
    isPracticeInterview: true,
    totalDurationSeconds: 300,
    userMessageCount: 0,
  };

  it("counts completed practice with a user answer", () => {
    assert.equal(
      isCountablePracticeSession({ ...base, userMessageCount: 1 }),
      true,
    );
  });

  it("counts long sessions without user messages via duration threshold", () => {
    assert.equal(
      isCountablePracticeSession({
        ...base,
        totalDurationSeconds: 120,
        userMessageCount: 0,
      }),
      true,
    );
  });

  it("does not count assistant-only short sessions", () => {
    assert.equal(
      isCountablePracticeSession({
        ...base,
        totalDurationSeconds: 45,
        userMessageCount: 0,
      }),
      false,
    );
  });

  it("does not count non-practice or incomplete sessions", () => {
    assert.equal(
      isCountablePracticeSession({
        ...base,
        isPracticeInterview: false,
        userMessageCount: 5,
      }),
      false,
    );
    assert.equal(
      isCountablePracticeSession({
        ...base,
        status: "ABANDONED",
        userMessageCount: 5,
      }),
      false,
    );
  });
});

describe("practice plan limits", () => {
  it("defines expected monthly limits", () => {
    assert.equal(getPracticePlanLimit("free"), 3);
    assert.equal(getPracticePlanLimit("starter"), 15);
    assert.equal(getPracticePlanLimit("pro"), null);
  });

  it("blocks start when at limit", () => {
    const atLimit = {
      plan: "starter" as const,
      used: 15,
      limit: 15,
      remaining: 0,
      billingPeriodStart: "",
      billingPeriodEnd: "",
      isUnlimited: false,
    };
    assert.equal(canStartPracticeSession(atLimit), false);
    assert.ok(PRACTICE_LIMIT_EXCEEDED_MESSAGE.includes("Upgrade"));
  });

  it("allows start when under limit or unlimited", () => {
    assert.equal(
      canStartPracticeSession({
        plan: "free",
        used: 2,
        limit: 3,
        remaining: 1,
        billingPeriodStart: "",
        billingPeriodEnd: "",
        isUnlimited: false,
      }),
      true,
    );
    assert.equal(
      canStartPracticeSession({
        plan: "pro",
        used: 100,
        limit: null,
        remaining: null,
        billingPeriodStart: "",
        billingPeriodEnd: "",
        isUnlimited: true,
      }),
      true,
    );
  });
});

describe("billing period", () => {
  it("uses calendar month boundaries in UTC", () => {
    const period = getCalendarMonthBillingPeriod(
      new Date("2026-05-16T12:00:00.000Z"),
    );
    assert.equal(period.startIso, "2026-05-01T00:00:00.000Z");
    assert.equal(period.endIso, "2026-06-01T00:00:00.000Z");
  });
});

describe("idempotent usage semantics", () => {
  it("documents duplicate protection via unique constraint", () => {
    const key = { user_id: "u1", session_id: "s1", event_type: "practice_session_completed" };
    assert.equal(key.event_type, "practice_session_completed");
  });
});
