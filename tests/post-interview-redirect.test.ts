import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePostInterviewRedirect } from "../src/lib/session/post-interview-redirect";

const base = {
  sessionId: "sess-1",
  interviewId: "int-1",
};

describe("resolvePostInterviewRedirect", () => {
  it("uses thank-you only for public invite participants", () => {
    const plan = resolvePostInterviewRedirect({
      ...base,
      isPractice: false,
      isPreview: false,
      isInviteFlow: true,
      isAuthenticated: false,
    });
    assert.equal(plan.thankYouOnly, true);
    assert.equal(plan.redirectPath, null);
  });

  it("uses thank-you only for unauthenticated public slug interviews", () => {
    const plan = resolvePostInterviewRedirect({
      ...base,
      isPractice: false,
      isPreview: false,
      isInviteFlow: false,
      isAuthenticated: false,
    });
    assert.equal(plan.thankYouOnly, true);
  });

  it("redirects practice sessions to my-sessions detail", () => {
    const plan = resolvePostInterviewRedirect({
      ...base,
      isPractice: true,
      isPreview: false,
      isInviteFlow: false,
      isAuthenticated: true,
      userType: "candidate",
    });
    assert.equal(plan.redirectPath, "/my-sessions/sess-1");
    assert.equal(plan.fallbackPath, "/my-sessions/sess-1");
    assert.equal(plan.isCandidatePractice, true);
  });

  it("redirects recruiters to interview results", () => {
    const plan = resolvePostInterviewRedirect({
      ...base,
      isPractice: false,
      isPreview: false,
      isInviteFlow: false,
      isAuthenticated: true,
      userType: "recruiter",
    });
    assert.equal(
      plan.redirectPath,
      "/interviews/int-1/results?session=sess-1",
    );
    assert.equal(plan.isRecruiter, true);
  });
});
