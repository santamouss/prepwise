import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeAsrText } from "../src/lib/voice/merge-asr-text";
import {
  DEFAULT_SPEECH_STARTED_RECENT_MS,
  isTranscriptReadyAfterSilence,
  mergeAsrText as mergeFromHelpers,
} from "../server/openai-voice-relay-helpers";

describe("mergeAsrText", () => {
  it("re-exports the same merge helper from relay helpers", () => {
    const a = "hello world";
    assert.equal(mergeFromHelpers(a, "hello world again"), mergeAsrText(a, "hello world again"));
  });

  it("merges multiple ASR fragments into one answer", () => {
    const first =
      "Yes, tell me. Product manager at First Service. I've been leading products the last seven years.";
    const second = "and I also launched a billing platform that reduced churn.";
    const merged = mergeAsrText(first, second);
    assert.match(merged, /seven years/i);
    assert.match(merged, /billing platform/i);
    assert.match(merged, /reduced churn/i);
  });

  it("keeps superset when a later fragment contains the earlier text", () => {
    const short = "Yes, tell me Guru Guru.";
    const longer =
      "Yes, tell me Guru Guru.product manager at First Service. I've been leading products the last seven years.";
    assert.equal(mergeAsrText(short, longer), longer);
  });

  it("stitches overlapping word boundaries", () => {
    const merged = mergeAsrText(
      "I led the team for seven years",
      "seven years and grew revenue",
    );
    assert.equal(merged, "I led the team for seven years and grew revenue");
  });
});

describe("isTranscriptReadyAfterSilence", () => {
  it("does not commit mock answers until stable silence after speech stop", () => {
    const now = 10_000;
    const lastUpdate = 9_200;
    const lastStop = 9_500;
    assert.equal(
      isTranscriptReadyAfterSilence(
        now,
        lastUpdate,
        lastStop,
        900,
        DEFAULT_SPEECH_STARTED_RECENT_MS,
        4500,
      ),
      false,
    );
    assert.equal(
      isTranscriptReadyAfterSilence(
        13_500,
        lastUpdate,
        lastStop,
        900,
        DEFAULT_SPEECH_STARTED_RECENT_MS,
        4500,
      ),
      true,
    );
  });
});
