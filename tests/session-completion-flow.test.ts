import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyThankYouLockToPlan,
  coerceCompletionPhase,
  lockCompletionFlowBranch,
  markCompletionRunCompleted,
  releaseActiveCompletionRunOnCancel,
  resolveFeedbackPollTerminalPhase,
  shouldStartCompletionRun,
} from "../src/lib/session/session-completion-flow";
import { resolvePostInterviewRedirect } from "../src/lib/session/post-interview-redirect";

describe("lockCompletionFlowBranch", () => {
  it("locks thank-you once chosen for a public participant", () => {
    let branch = lockCompletionFlowBranch(null, true);
    assert.equal(branch, "thank-you");
    branch = lockCompletionFlowBranch(branch, false);
    assert.equal(branch, "thank-you");
  });

  it("locks feedback polling once chosen for authenticated flows", () => {
    let branch = lockCompletionFlowBranch(null, false);
    assert.equal(branch, "feedback-poll");
    branch = lockCompletionFlowBranch(branch, true);
    assert.equal(branch, "feedback-poll");
  });
});

describe("coerceCompletionPhase", () => {
  it("does not leave thank-you for processing", () => {
    assert.equal(
      coerceCompletionPhase("thank-you", "processing"),
      "thank-you",
    );
  });

  it("allows transitions from processing", () => {
    assert.equal(
      coerceCompletionPhase("processing", "feedback-pending"),
      "feedback-pending",
    );
  });
});

describe("completion run lifecycle", () => {
  const runKey = "sess-1:feedback-poll";

  it("allows restart after cancelled non-terminal run", () => {
    let active: string | null = runKey;
    const completed: string | null = null;

    assert.equal(shouldStartCompletionRun(completed, active, runKey), false);

    active = releaseActiveCompletionRunOnCancel(active, runKey, "processing");
    assert.equal(active, null);
    assert.equal(shouldStartCompletionRun(completed, active, runKey), true);
  });

  it("blocks restart after terminal completion", () => {
    const completed = markCompletionRunCompleted(runKey);
    assert.equal(shouldStartCompletionRun(completed, null, runKey), false);
  });

  it("does not release active run when phase is already terminal", () => {
    const active = runKey;
    const released = releaseActiveCompletionRunOnCancel(
      active,
      runKey,
      "feedback-pending",
    );
    assert.equal(released, runKey);
  });
});

describe("resolveFeedbackPollTerminalPhase", () => {
  it("uses fallback when polling times out without feedback", () => {
    assert.equal(
      resolveFeedbackPollTerminalPhase({
        saveOk: true,
        feedbackReady: false,
        redirectPath: "/my-sessions/s1",
      }),
      "feedback-pending",
    );
  });

  it("redirects when feedback is ready", () => {
    assert.equal(
      resolveFeedbackPollTerminalPhase({
        saveOk: true,
        feedbackReady: true,
        redirectPath: "/my-sessions/s1",
      }),
      "redirecting",
    );
  });
});

describe("public completion plan stability", () => {
  it("stays thank-you only after auth would change recruiter redirect", () => {
    const publicPlan = resolvePostInterviewRedirect({
      sessionId: "s1",
      interviewId: "i1",
      isPractice: false,
      isPreview: false,
      isInviteFlow: false,
      isAuthenticated: false,
    });
    assert.equal(publicPlan.thankYouOnly, true);

    const locked = applyThankYouLockToPlan(
      resolvePostInterviewRedirect({
        sessionId: "s1",
        interviewId: "i1",
        isPractice: false,
        isPreview: false,
        isInviteFlow: false,
        isAuthenticated: true,
        userType: "recruiter",
      }),
    );
    assert.equal(locked.thankYouOnly, true);
    assert.equal(locked.redirectPath, null);
  });
});
