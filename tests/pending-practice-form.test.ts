import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPracticeLoginUrl,
  type PendingPracticeForm,
} from "../src/lib/practice/pending-practice-form";
import {
  getPostLoginPath,
  getRegisterHref,
  safeRedirectPath,
} from "../src/lib/auth/post-login-redirect";

describe("pending-practice-form helpers", () => {
  it("buildPracticeLoginUrl includes next, redirect, and autoStart", () => {
    assert.equal(
      buildPracticeLoginUrl(),
      "/login?next=%2Fpractice&redirect=%2Fpractice&autoStart=true",
    );
  });
});

describe("post-login-redirect", () => {
  it("rejects unsafe redirect paths", () => {
    assert.equal(safeRedirectPath("//evil.com"), null);
    assert.equal(safeRedirectPath("https://evil.com"), null);
    assert.equal(safeRedirectPath("/practice"), "/practice");
  });

  it("builds practice auto-start path", () => {
    assert.equal(getPostLoginPath("/practice", "true"), "/practice?autoStart=true");
    assert.equal(getPostLoginPath("/practice", null), "/practice");
    assert.equal(getPostLoginPath(null, "true"), "/dashboard");
  });

  it("builds register href with query params", () => {
    assert.equal(
      getRegisterHref("/practice", "true"),
      "/register?redirect=%2Fpractice&next=%2Fpractice&autoStart=true",
    );
  });

  it("getPostLoginPath accepts next param", () => {
    assert.equal(getPostLoginPath(null, "true", "/practice"), "/practice?autoStart=true");
  });
});

describe("PendingPracticeForm shape", () => {
  it("accepts minimal valid payload type", () => {
    const form: PendingPracticeForm = {
      role: "PM",
      interviewType: "BEHAVIORAL",
      durationMinutes: 10,
      practiceMode: "coach",
    };
    assert.equal(form.role, "PM");
  });
});
