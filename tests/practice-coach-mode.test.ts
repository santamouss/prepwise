import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  applyPracticeModeToVoicePrompt,
  buildSystemPromptIncludesCoachInstructions,
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
