import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLinkedInJobUrl,
  validateJobPostingExtractedText,
} from "../src/lib/practice/validate-job-posting-text";

describe("validateJobPostingExtractedText", () => {
  it("accepts substantive job posting text", () => {
    const text =
      "We are hiring a Product Manager to lead roadmap planning. ".repeat(10);
    assert.equal(validateJobPostingExtractedText(text).ok, true);
  });

  it("rejects very short extracts", () => {
    const result = validateJobPostingExtractedText("Short posting.");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "too_short");
  });

  it("rejects login-wall style pages", () => {
    const result = validateJobPostingExtractedText(
      [
        "Sign in Join LinkedIn Welcome back.",
        "Email Password Forgot password? Sign in with Google.",
        "New to LinkedIn? Join now. Security verification required.",
        "Please enable cookies to continue viewing this job posting page.",
      ].join(" "),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "blocked_page");
  });
});

describe("isLinkedInJobUrl", () => {
  it("detects LinkedIn hosts", () => {
    assert.equal(
      isLinkedInJobUrl("https://www.linkedin.com/jobs/view/123"),
      true,
    );
    assert.equal(isLinkedInJobUrl("https://example.com/jobs/1"), false);
  });
});
