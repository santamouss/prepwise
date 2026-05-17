import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COACH_ANSWER_REQUIRED_MESSAGE,
  COACH_UI_DONE_ANSWERING,
  COACH_UI_NEXT_QUESTION,
  COACH_UI_TITLE,
  COACH_UI_TRY_AGAIN,
  getLatestUserAnswerText,
  hasCoachAnswerContent,
  isCoachModePractice,
  isCoachNextPhrase,
  isCoachRetryPhrase,
  shouldShowCoachControls,
} from "../src/lib/practice/coach-mode-ui";

describe("coach mode UI helpers", () => {
  it("enables controls only for coach practice sessions", () => {
    assert.equal(isCoachModePractice("coach"), true);
    assert.equal(isCoachModePractice("mock"), false);
    assert.equal(shouldShowCoachControls("coach", false), true);
    assert.equal(shouldShowCoachControls("mock", false), false);
    assert.equal(shouldShowCoachControls("coach", true), false);
  });

  it("detects retry and next voice phrases", () => {
    assert.equal(isCoachRetryPhrase("can I try again"), true);
    assert.equal(isCoachNextPhrase("next question please"), true);
    assert.equal(isCoachRetryPhrase("next question"), false);
  });

  it("requires substantive answer content before done", () => {
    assert.equal(hasCoachAnswerContent("", []), false);
    assert.equal(hasCoachAnswerContent("Well", [{ role: "user", content: "Well" }]), false);
    assert.equal(
      hasCoachAnswerContent(
        "",
        [{
          role: "user",
          content: "I led a cross-functional launch that improved activation by twenty percent",
        }],
      ),
      true,
    );
    assert.equal(
      getLatestUserAnswerText("live answer", [{ role: "user", content: "old" }]),
      "live answer",
    );
  });

  it("exposes the answer required message", () => {
    assert.match(COACH_ANSWER_REQUIRED_MESSAGE, /Say your answer first/i);
  });

  it("uses exact coach control copy for production bundle searchability", () => {
    assert.equal(COACH_UI_TITLE, "Coach Mode");
    assert.equal(COACH_UI_DONE_ANSWERING, "I'm done answering");
    assert.equal(COACH_UI_TRY_AGAIN, "Try again");
    assert.equal(COACH_UI_NEXT_QUESTION, "Next question");
  });
});

describe("coach mode navigation semantics", () => {
  it("retry phrase does not imply next question", () => {
    assert.equal(isCoachNextPhrase("try again"), false);
    assert.equal(isCoachRetryPhrase("try again"), true);
  });
});
