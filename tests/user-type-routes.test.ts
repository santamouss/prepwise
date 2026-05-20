import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getEffectiveUserType,
  isEffectiveCandidate,
} from "../src/lib/auth/user-type-routes";

describe("user-type-routes", () => {
  it("treats null user_type as candidate", () => {
    assert.equal(getEffectiveUserType(null), "candidate");
    assert.equal(getEffectiveUserType(undefined), "candidate");
    assert.equal(isEffectiveCandidate(null), true);
  });

  it("preserves recruiter user_type", () => {
    assert.equal(getEffectiveUserType("recruiter"), "recruiter");
    assert.equal(isEffectiveCandidate("recruiter"), false);
  });
});
