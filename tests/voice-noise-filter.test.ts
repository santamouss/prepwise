import assert from "node:assert/strict";
import test from "node:test";

import {
  createLiveTranscriptGateState,
  DEFAULT_MIN_SPEECH_SEGMENT_MS,
  evaluateTranscriptForAcceptance,
  isAllowedShortSubstantiveAnswer,
  isCoachControlTranscript,
  isLowConfidenceShortTranscript,
  isRejectableNoiseFragment,
  isSubstantiveTranscript,
  readTranscriptCommitThresholds,
  shouldIgnoreShortSpeechBurst,
  shouldSurfaceLiveTranscript,
  updateLiveTranscriptGateState,
} from "../server/openai-voice-relay-helpers";

const thresholds = { minWords: 8, minChars: 40 };

test("isRejectableNoiseFragment rejects common accidental ASR phrases", () => {
  for (const phrase of ["bye", "bye-bye", "yeah", "okay", "hello", "hmm", "uh", "yup"]) {
    assert.equal(isRejectableNoiseFragment(phrase), true, phrase);
  }
});

test("isRejectableNoiseFragment allows navigation, coach controls, and short answers", () => {
  assert.equal(isRejectableNoiseFragment("next question"), false);
  assert.equal(isRejectableNoiseFragment("move on"), false);
  assert.equal(isRejectableNoiseFragment("I'm done answering"), false);
  assert.equal(isRejectableNoiseFragment("Google"), false);
  assert.equal(isRejectableNoiseFragment("Python"), false);
  assert.equal(isRejectableNoiseFragment("TypeScript"), false);
  assert.equal(isAllowedShortSubstantiveAnswer("yes"), true);
  assert.equal(isCoachControlTranscript("try again"), true);
});

test("shouldIgnoreShortSpeechBurst ignores sub-500ms noise but keeps protected shorts", () => {
  assert.equal(
    shouldIgnoreShortSpeechBurst("bye", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50),
    true,
  );
  assert.equal(
    shouldIgnoreShortSpeechBurst("Google", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50),
    false,
  );
  assert.equal(
    shouldIgnoreShortSpeechBurst("next question", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50),
    false,
  );
  assert.equal(shouldIgnoreShortSpeechBurst("bye", 600), false);
});

test("evaluateTranscriptForAcceptance rejects low-confidence 1–2 word fragments", () => {
  const result = evaluateTranscriptForAcceptance("hello", thresholds, {
    logprobs: [-2.5, -2.8],
  });
  assert.equal(result.accept, false);
  assert.equal(result.reason, "low-confidence");
});

test("shouldSurfaceLiveTranscript gates short live text until stable or large enough", () => {
  const state = createLiveTranscriptGateState();
  const t0 = 1_000;
  updateLiveTranscriptGateState(state, "bye", t0);
  assert.equal(shouldSurfaceLiveTranscript("bye", state, t0 + 500), false);
  assert.equal(shouldSurfaceLiveTranscript("bye", state, t0 + 1_300), true);

  const googleState = createLiveTranscriptGateState();
  updateLiveTranscriptGateState(googleState, "Google", t0);
  assert.equal(shouldSurfaceLiveTranscript("Google", googleState, t0), true);

  const longState = createLiveTranscriptGateState();
  const longText = "one two three four";
  updateLiveTranscriptGateState(longState, longText, t0);
  assert.equal(shouldSurfaceLiveTranscript(longText, longState, t0), true);
});

test("isSubstantiveTranscript accepts protected short answers under commit thresholds", () => {
  const coachThresholds = readTranscriptCommitThresholds({}, "coach");
  assert.equal(isSubstantiveTranscript("yes", coachThresholds), true);
  assert.equal(isSubstantiveTranscript("Google", coachThresholds), true);
  assert.equal(isSubstantiveTranscript("bye-bye", coachThresholds), false);
});

test("isLowConfidenceShortTranscript ignores long transcripts even with poor logprobs", () => {
  assert.equal(
    isLowConfidenceShortTranscript("one two three four five", [-3, -3, -3, -3, -3]),
    false,
  );
});
