import assert from "node:assert/strict";
import test from "node:test";

import {
  createLiveTranscriptGateState,
  DEFAULT_MIN_SPEECH_SEGMENT_MS,
  DEFAULT_SHORT_ANSWER_PARKER_TURN_MS,
  evaluateTranscriptForAcceptance,
  hasRecentParkerTurn,
  isAllowedShortSubstantiveAnswer,
  isCoachControlTranscript,
  isLowConfidenceShortTranscript,
  isRejectableNoiseFragment,
  isSubstantiveTranscript,
  readTranscriptCommitThresholds,
  requiresRecentParkerTurnForShortAnswer,
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
  const parkerTurnAt = 10_000;
  const now = parkerTurnAt + 1_000;
  assert.equal(
    shouldIgnoreShortSpeechBurst("bye", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50),
    true,
  );
  assert.equal(
    shouldIgnoreShortSpeechBurst("Google", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50, undefined, {
      lastParkerTurnAtMs: parkerTurnAt,
      nowMs: now,
    }),
    false,
  );
  assert.equal(
    shouldIgnoreShortSpeechBurst("Google", DEFAULT_MIN_SPEECH_SEGMENT_MS - 50),
    true,
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
  const parkerTurnAt = 500;
  updateLiveTranscriptGateState(state, "bye", t0);
  assert.equal(shouldSurfaceLiveTranscript("bye", state, t0 + 500), false);
  assert.equal(shouldSurfaceLiveTranscript("bye", state, t0 + 1_300), true);

  const googleState = createLiveTranscriptGateState();
  updateLiveTranscriptGateState(googleState, "Google", t0);
  assert.equal(
    shouldSurfaceLiveTranscript("Google", googleState, t0, {
      lastParkerTurnAtMs: parkerTurnAt,
    }),
    true,
  );
  assert.equal(shouldSurfaceLiveTranscript("Google", googleState, t0), false);

  const longState = createLiveTranscriptGateState();
  const longText = "one two three four";
  updateLiveTranscriptGateState(longState, longText, t0);
  assert.equal(shouldSurfaceLiveTranscript(longText, longState, t0), true);
});

test("isSubstantiveTranscript accepts protected short answers under commit thresholds", () => {
  const coachThresholds = readTranscriptCommitThresholds({}, "coach");
  const parkerTurnAt = 20_000;
  const now = parkerTurnAt + 5_000;
  const withParker = { lastParkerTurnAtMs: parkerTurnAt, nowMs: now };
  assert.equal(isSubstantiveTranscript("yes", coachThresholds, withParker), true);
  assert.equal(isSubstantiveTranscript("Google", coachThresholds, withParker), true);
  assert.equal(isSubstantiveTranscript("yes", coachThresholds), false);
  assert.equal(isSubstantiveTranscript("bye-bye", coachThresholds, withParker), false);
});

test("sub-3-word answers require a Parker turn within 30 seconds", () => {
  const parkerTurnAt = 50_000;
  const withinWindow = parkerTurnAt + 10_000;
  const outsideWindow = parkerTurnAt + DEFAULT_SHORT_ANSWER_PARKER_TURN_MS + 1;
  assert.equal(requiresRecentParkerTurnForShortAnswer("Google"), true);
  assert.equal(requiresRecentParkerTurnForShortAnswer("next question"), false);
  assert.equal(hasRecentParkerTurn(parkerTurnAt, withinWindow), true);
  assert.equal(hasRecentParkerTurn(parkerTurnAt, outsideWindow), false);

  const accepted = evaluateTranscriptForAcceptance("Python", thresholds, {
    lastParkerTurnAtMs: parkerTurnAt,
    nowMs: withinWindow,
  });
  assert.equal(accepted.accept, true);

  const rejected = evaluateTranscriptForAcceptance("Python", thresholds, {
    lastParkerTurnAtMs: parkerTurnAt,
    nowMs: outsideWindow,
  });
  assert.equal(rejected.accept, false);
  assert.equal(rejected.reason, "no-recent-parker-turn");
});

test("isLowConfidenceShortTranscript ignores long transcripts even with poor logprobs", () => {
  assert.equal(
    isLowConfidenceShortTranscript("one two three four five", [-3, -3, -3, -3, -3]),
    false,
  );
});
