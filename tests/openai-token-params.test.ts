import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTemperatureParams,
  isGpt5Model,
  usesMaxCompletionTokens,
} from "../src/lib/ai/providers/openai";

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

describe("isGpt5Model", () => {
  it("detects GPT-5 family models", () => {
    assert.equal(isGpt5Model("gpt-5-mini"), true);
    assert.equal(isGpt5Model("GPT-5"), true);
    assert.equal(isGpt5Model("gpt-4o-mini"), false);
  });
});

describe("buildTemperatureParams", () => {
  it("omits temperature for GPT-5 unless explicitly set to 1", () => {
    assert.deepEqual(buildTemperatureParams("gpt-5-mini"), {});
    assert.deepEqual(buildTemperatureParams("gpt-5-mini", 0.7), {});
    assert.deepEqual(buildTemperatureParams("gpt-5-mini", 1), { temperature: 1 });
  });

  it("defaults legacy models to 0.7 when temperature is omitted", () => {
    assert.deepEqual(buildTemperatureParams("gpt-4o-mini"), { temperature: 0.7 });
    assert.deepEqual(buildTemperatureParams("gpt-4o", 0.5), { temperature: 0.5 });
  });
});
