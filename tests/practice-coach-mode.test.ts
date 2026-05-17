import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  applyPracticeModeToVoicePrompt,
  buildCoachModeInitialSystemGreeting,
  buildSystemPromptIncludesCoachInstructions,
  COACH_MODE_OPENING_LINE,
  COACH_MODE_VOICE_INSTRUCTIONS,
} from "../src/lib/practice/coach-mode-prompt";
import {
  buildPracticeCustomBranding,
  getPracticeMode,
  normalizePracticeMode,
} from "../src/lib/practice/practice-mode";

const practiceModeInput = z.enum(["mock", "coach"]).default("mock");

describe("getPracticeMode", () => {
  it("defaults to mock for practice interviews without practiceMode", () => {
    assert.equal(
      getPracticeMode({
        isPractice: true,
        customBranding: { isPractice: true, source: "practice" },
      }),
      "mock",
    );
  });

  it("reads coach from customBranding on practice interviews", () => {
    assert.equal(
      getPracticeMode({
        isPractice: true,
        customBranding: {
          isPractice: true,
          source: "practice",
          practiceMode: "coach",
        },
      }),
      "coach",
    );
  });

  it("does not enable coach for non-practice recruiter interviews", () => {
    assert.equal(
      getPracticeMode({
        isPractice: false,
        customBranding: { practiceMode: "coach" },
      }),
      "mock",
    );
  });
});

describe("practice.start branding", () => {
  it("accepts coach in input schema and stores practiceMode in customBranding", () => {
    assert.equal(practiceModeInput.parse(undefined), "mock");
    assert.equal(practiceModeInput.parse("coach"), "coach");

    assert.deepEqual(buildPracticeCustomBranding("coach"), {
      isPractice: true,
      source: "practice",
      practiceMode: "coach",
    });
    assert.equal(normalizePracticeMode("invalid"), "mock");
  });
});

describe("coach mode opening", () => {
  it("requires the coach mode opening line in prompt and greeting", () => {
    const prompt = applyPracticeModeToVoicePrompt("base", "coach");
    assert.ok(prompt.includes(COACH_MODE_OPENING_LINE));
    assert.ok(buildCoachModeInitialSystemGreeting(0).includes(COACH_MODE_OPENING_LINE));
  });
});

describe("coach mode concrete feedback", () => {
  it("includes score, example phrases, STAR, and short-answer handling", () => {
    const prompt = applyPracticeModeToVoicePrompt("base", "coach");
    assert.match(prompt, /X\/10|out of 10/i);
    assert.match(prompt, /For example, you could say/i);
    assert.match(prompt, /Try adding a sentence like/i);
    assert.match(prompt, /STAR|Situation|Task|Action|Result/i);
    assert.match(prompt, /user\/observation|metric or impact/i);
    assert.match(prompt, /too short to evaluate/i);
  });

  it("does not add concrete feedback instructions to mock mode", () => {
    const mockPrompt = applyPracticeModeToVoicePrompt("base", "mock");
    assert.equal(mockPrompt, "base");
    assert.doesNotMatch(mockPrompt, /For example, you could say/i);
  });
});

describe("buildSystemPrompt coach instructions", () => {
  const basePrompt = "You are Parker, a professional AI interviewer.";

  it("includes coach instructions only for coach mode", () => {
    const coachPrompt = applyPracticeModeToVoicePrompt(basePrompt, "coach");
    assert.ok(coachPrompt.includes(COACH_MODE_VOICE_INSTRUCTIONS));
    assert.equal(buildSystemPromptIncludesCoachInstructions(basePrompt, "coach"), true);
  });

  it("does not include coach instructions for mock or undefined", () => {
    assert.equal(applyPracticeModeToVoicePrompt(basePrompt, "mock"), basePrompt);
    assert.equal(applyPracticeModeToVoicePrompt(basePrompt, undefined), basePrompt);
    assert.equal(buildSystemPromptIncludesCoachInstructions(basePrompt, "mock"), true);
    assert.equal(buildSystemPromptIncludesCoachInstructions(basePrompt, undefined), true);
  });
});
