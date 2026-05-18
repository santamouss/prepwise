import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeDelivery,
  buildDeliverySuggestions,
  computeWordsPerMinute,
  countWords,
  pickCoachDeliverySuggestion,
} from "../src/lib/voice/delivery-analysis";

test("countWords ignores extra whitespace", () => {
  assert.equal(countWords("  one   two three  "), 3);
});

test("computeWordsPerMinute uses at least one second", () => {
  assert.equal(computeWordsPerMinute(120, 0), 7200);
  assert.equal(computeWordsPerMinute(60, 60), 60);
});

test("analyzeDelivery detects filler words", () => {
  const result = analyzeDelivery({
    transcript: "Um, I think, like, we shipped it, you know, basically on time.",
    durationSeconds: 30,
  });
  assert.ok(result.fillerWordCount >= 3);
  assert.ok(result.fillerWords.includes("um"));
  assert.ok(result.fillerWords.includes("like"));
});

test("analyzeDelivery detects hedging phrases", () => {
  const result = analyzeDelivery({
    transcript:
      "I think maybe we kind of improved retention, sort of, probably by ten percent.",
    durationSeconds: 40,
  });
  assert.ok(result.hedgingPhraseCount >= 3);
  assert.ok(result.hedgingPhrases.includes("I think"));
});

test("analyzeDelivery flags short answers", () => {
  const result = analyzeDelivery({
    transcript: "We improved things a bit.",
    durationSeconds: 12,
    shortAnswerMaxWords: 40,
  });
  assert.equal(result.answerTooShort, true);
  assert.ok(result.suggestions.some((s) => s.includes("structure")));
});

test("analyzeDelivery counts long pauses from timing gaps", () => {
  const result = analyzeDelivery({
    transcript:
      "First I set up the experiment and then we measured results across two cohorts with clear success metrics.",
    durationSeconds: 90,
    pauseDurations: [0.5, 2.5, 3.1, 1.0],
  });
  assert.equal(result.longPauseCount, 2);
});

test("buildDeliverySuggestions recommends slower pace when WPM is high", () => {
  const suggestions = buildDeliverySuggestions({
    wordCount: 80,
    wordsPerMinute: 190,
    fillerWordCount: 0,
    hedgingPhraseCount: 0,
    longPauseCount: 0,
    answerTooShort: false,
    answerTooLong: false,
    transcript: "We drove revenue growth through partnerships and pricing tests.",
    wpmLow: 110,
    wpmHigh: 165,
  });
  assert.ok(suggestions.includes("Slow down slightly"));
});

test("pickCoachDeliverySuggestion returns first actionable tip", () => {
  const analysis = analyzeDelivery({
    transcript: "Um, I think maybe we, like, did the project.",
    durationSeconds: 20,
  });
  const tip = pickCoachDeliverySuggestion(analysis);
  assert.ok(tip);
  assert.match(tip!, /filler|hedging|opening|pace|structure/i);
});
