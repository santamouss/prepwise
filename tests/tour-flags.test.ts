import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isIntervieweeSessionTourEnabled,
  isRecruiterDashboardTourEnabled,
  isRecruiterTourBlockedPath,
} from "../src/lib/tour/tour-flags";

describe("tour-flags", () => {
  it("blocks recruiter tours on candidate and session paths", () => {
    assert.equal(isRecruiterTourBlockedPath("/practice"), true);
    assert.equal(isRecruiterTourBlockedPath("/my-sessions/abc"), true);
    assert.equal(isRecruiterTourBlockedPath("/onboarding"), true);
    assert.equal(isRecruiterTourBlockedPath("/i/foo/session"), true);
    assert.equal(isRecruiterTourBlockedPath("/interviews"), false);
  });

  it("enables recruiter dashboard tour only for recruiters on recruiter routes", () => {
    assert.equal(isRecruiterDashboardTourEnabled("recruiter", "/dashboard"), true);
    assert.equal(isRecruiterDashboardTourEnabled("candidate", "/dashboard"), false);
    assert.equal(isRecruiterDashboardTourEnabled("recruiter", "/practice"), false);
    assert.equal(isRecruiterDashboardTourEnabled(null, "/dashboard"), false);
  });

  it("disables interviewee session tours by default", () => {
    assert.equal(isIntervieweeSessionTourEnabled(), false);
  });
});
