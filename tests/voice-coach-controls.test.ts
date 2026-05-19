import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

describe("coach mode controls UI", () => {
  it("shows done answering only while answering and choice buttons after coaching", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/session/coach-mode-controls.tsx"),
      "utf8",
    );
    assert.match(source, /COACH_UI_DONE_ANSWERING/);
    assert.match(source, /phase === "answering"/);
    assert.match(source, /COACH_UI_TRY_AGAIN/);
    assert.match(source, /COACH_UI_NEXT_QUESTION/);
    assert.match(source, /phase === "waiting_for_choice"/);
    assert.match(source, /doneAnsweringDisabled/);
  });
});

describe("voice-interface coach wiring", () => {
  it("wires try again and next question handlers", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/session/voice-interface.tsx"),
      "utf8",
    );
    assert.match(source, /onTryAgain=\{handleCoachTryAgain\}/);
    assert.match(source, /onNextQuestion=\{handleCoachNextQuestion\}/);
    assert.match(source, /sendCoachRetryQuestion/);
    assert.match(source, /voice\.nextQuestion/);
  });
});

describe("use-voice coach dedupe", () => {
  it("guards duplicate coach_answer_done sends", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/hooks/use-voice.ts"),
      "utf8",
    );
    assert.match(source, /coachAnswerDoneSentRef/);
    assert.match(source, /coach_answer_done/);
  });
});
