import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRealtimeConversationCreateEvent,
  buildRealtimeTextContent,
  isFillerOnlyTranscript,
  isSubstantiveTranscript,
  isWithinFragmentMergeWindow,
  readTranscriptCommitThresholds,
  shouldAllowTtsBargeIn,
} from "../server/openai-voice-relay-helpers";

test("buildRealtimeTextContent uses output_text for assistant and input_text otherwise", () => {
  assert.deepEqual(buildRealtimeTextContent("user", "hello"), [
    { type: "input_text", text: "hello" },
  ]);
  assert.deepEqual(buildRealtimeTextContent("system", "note"), [
    { type: "input_text", text: "note" },
  ]);
  assert.deepEqual(buildRealtimeTextContent("assistant", "hi there"), [
    { type: "output_text", text: "hi there" },
  ]);
});

test("isSubstantiveTranscript rejects short filler fragments", () => {
  const thresholds = { minWords: 8, minChars: 40 };
  assert.equal(isFillerOnlyTranscript("Well"), true);
  assert.equal(isFillerOnlyTranscript("Well, I know"), true);
  assert.equal(isFillerOnlyTranscript("Yeah"), true);
  assert.equal(isSubstantiveTranscript("Well, I know", thresholds), false);
  assert.equal(isSubstantiveTranscript("I think", thresholds), false);
  assert.equal(
    isSubstantiveTranscript(
      "Well I led a cross functional team to launch a new billing workflow that reduced churn by twelve percent",
      thresholds,
    ),
    true,
  );
});

test("readTranscriptCommitThresholds uses coach merge window and higher minimums", () => {
  const coach = readTranscriptCommitThresholds(
    {
      VOICE_MIN_COMMIT_WORDS: "8",
      VOICE_MIN_COMMIT_CHARS: "40",
      VOICE_COACH_FRAGMENT_MERGE_MS: "5000",
    },
    "coach",
  );
  assert.equal(coach.minWords, 10);
  assert.equal(coach.minChars, 50);
  assert.equal(coach.fragmentMergeMs, 5000);
});

test("isWithinFragmentMergeWindow returns true only inside the merge window", () => {
  const now = 10_000;
  assert.equal(isWithinFragmentMergeWindow(now, 8_000, 4_000), true);
  assert.equal(isWithinFragmentMergeWindow(now, 5_000, 4_000), false);
});

test("buildRealtimeConversationCreateEvent maps assistant history to output_text", () => {
  const event = buildRealtimeConversationCreateEvent("assistant", "prior answer");
  assert.equal(event.type, "conversation.item.create");
  assert.equal(event.item.role, "assistant");
  assert.deepEqual(event.item.content, [
    { type: "output_text", text: "prior answer" },
  ]);
});

test("does not allow TTS barge-in before assistant audio has actually started", () => {
  assert.equal(
    shouldAllowTtsBargeIn({
      inEchoCooldown: true,
      modelIsSpeaking: true,
      responseAudioStarted: false,
      ttsAudioStartedAt: 0,
      nowMs: 1000,
      responseTtsBytes: 0,
      rms: 3000,
      thresholdRms: 2400,
      consecutiveFrames: 3,
      thresholdFrames: 3,
    }),
    false,
  );
});

test("does not allow TTS barge-in until enough assistant audio has been delivered", () => {
  assert.equal(
    shouldAllowTtsBargeIn({
      inEchoCooldown: true,
      modelIsSpeaking: true,
      responseAudioStarted: true,
      ttsAudioStartedAt: 900,
      nowMs: 1200,
      responseTtsBytes: 20_000,
      rms: 3000,
      thresholdRms: 2400,
      consecutiveFrames: 3,
      thresholdFrames: 3,
    }),
    false,
  );
});

test("allows TTS barge-in only after sustained strong speech once assistant audio is underway", () => {
  assert.equal(
    shouldAllowTtsBargeIn({
      inEchoCooldown: true,
      modelIsSpeaking: true,
      responseAudioStarted: true,
      ttsAudioStartedAt: 500,
      nowMs: 1100,
      responseTtsBytes: 48_000,
      rms: 3000,
      thresholdRms: 2400,
      consecutiveFrames: 3,
      thresholdFrames: 3,
    }),
    true,
  );
});
