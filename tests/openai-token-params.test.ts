import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usesMaxCompletionTokens } from "../src/lib/ai/providers/openai";

describe("usesMaxCompletionTokens", () => {
  it("returns true for GPT-5 and reasoning model families", () => {
    assert.equal(usesMaxCompletionTokens("gpt-5-mini"), true);
    assert.equal(usesMaxCompletionTokens("GPT-5"), true);
    assert.equal(usesMaxCompletionTokens("o1-preview"), true);
    assert.equal(usesMaxCompletionTokens("o3-mini"), true);
    assert.equal(usesMaxCompletionTokens("o4-mini"), true);
  });

  it("returns false for legacy chat models", () => {
    assert.equal(usesMaxCompletionTokens("gpt-4o"), false);
    assert.equal(usesMaxCompletionTokens("gpt-4o-mini"), false);
    assert.equal(usesMaxCompletionTokens("gpt-4-turbo"), false);
    assert.equal(usesMaxCompletionTokens("gpt-3.5-turbo"), false);
  });
});
