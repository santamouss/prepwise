import assert from "node:assert/strict";
import test from "node:test";

import { buildPracticeGeneratorPrompt } from "../src/lib/ai/prompts/generator";
import {
  buildPracticeGeneratorDescription,
  normalizePracticeQuestionType,
} from "../src/lib/practice/constants";
import {
  RECRUITER_CODING_SCREEN_CUE,
  RECRUITER_EN_CODING_WHITEBOARD_RULES,
  selectVoiceModeSections,
} from "../src/lib/practice/practice-voice-prompt";

test("buildPracticeGeneratorDescription requires OPEN_ENDED for technical practice", () => {
  const desc = buildPracticeGeneratorDescription({
    role: "Staff Engineer",
    interviewType: "TECHNICAL",
    duration: 10,
  });
  assert.match(desc, /OPEN_ENDED only/i);
  assert.match(desc, /no CODING or WHITEBOARD/i);
  assert.match(desc, /system-design|architecture/i);
  assert.doesNotMatch(desc, /use CODING type only/i);
});

test("buildPracticeGeneratorPrompt constrains question types to OPEN_ENDED", () => {
  const messages = buildPracticeGeneratorPrompt("Practice interview", 10);
  const raw = messages.find((m) => m.role === "system")?.content ?? "";
  const system = typeof raw === "string" ? raw : "";
  assert.match(system, /OPEN_ENDED questions ONLY/i);
  assert.match(system, /Do NOT generate CODING, WHITEBOARD/i);
});

test("normalizePracticeQuestionType maps all types to OPEN_ENDED", () => {
  assert.equal(normalizePracticeQuestionType("CODING"), "OPEN_ENDED");
  assert.equal(normalizePracticeQuestionType("WHITEBOARD"), "OPEN_ENDED");
  assert.equal(normalizePracticeQuestionType("OPEN_ENDED"), "OPEN_ENDED");
});

test("practice voice sections avoid instructing Parker to use on-screen prompts", () => {
  const practice = selectVoiceModeSections(true, false);
  assert.equal(practice.visibilityRules, "");
  assert.match(practice.codingOrPracticeRules, /voice-only|OPEN_ENDED/i);
  assert.match(practice.codingOrPracticeRules, /NEVER say phrases/i);
  assert.ok(!practice.codingOrPracticeRules.includes(RECRUITER_CODING_SCREEN_CUE));
  assert.ok(!practice.codingOrPracticeRules.includes("code editor/whiteboard"));
});

test("recruiter voice sections still reference on-screen coding problems", () => {
  const recruiter = selectVoiceModeSections(false, false);
  assert.ok(recruiter.codingOrPracticeRules.includes(RECRUITER_CODING_SCREEN_CUE));
  assert.ok(RECRUITER_EN_CODING_WHITEBOARD_RULES.includes("on the participant's screen"));
  assert.match(recruiter.visibilityRules, /CODE_UPDATE/);
});
