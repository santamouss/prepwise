import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldSkipCandidatePracticeOnboarding } from "../src/lib/session/skip-practice-onboarding";

const practiceInterview = {
  isPractice: true,
  customBranding: { isPractice: true, source: "practice", practiceMode: "mock" as const },
  antiCheatingEnabled: false,
  videoEnabled: false,
  voiceEnabled: true,
};

const recruiterInterview = {
  isPractice: false,
  customBranding: null,
  antiCheatingEnabled: false,
  videoEnabled: false,
  voiceEnabled: true,
};

describe("shouldSkipCandidatePracticeOnboarding", () => {
  it("skips onboarding for candidate practice mock and coach", () => {
    assert.equal(shouldSkipCandidatePracticeOnboarding(practiceInterview), true);
    assert.equal(
      shouldSkipCandidatePracticeOnboarding({
        ...practiceInterview,
        customBranding: {
          isPractice: true,
          source: "practice",
          practiceMode: "coach",
        },
      }),
      true,
    );
  });

  it("does not skip recruiter-created interviews", () => {
    assert.equal(shouldSkipCandidatePracticeOnboarding(recruiterInterview), false);
  });

  it("does not skip recruiter preview even for practice templates", () => {
    assert.equal(
      shouldSkipCandidatePracticeOnboarding(practiceInterview, { isPreview: true }),
      false,
    );
  });

  it("keeps onboarding when anti-cheating is enabled", () => {
    assert.equal(
      shouldSkipCandidatePracticeOnboarding({
        ...practiceInterview,
        antiCheatingEnabled: true,
      }),
      false,
    );
  });

  it("keeps onboarding when video is enabled", () => {
    assert.equal(
      shouldSkipCandidatePracticeOnboarding({
        ...practiceInterview,
        videoEnabled: true,
      }),
      false,
    );
  });
});
