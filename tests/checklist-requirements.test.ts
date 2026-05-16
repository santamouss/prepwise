import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasChecklistStep,
  isChecklistItemRequired,
  resolveChecklistRequirements,
} from "../src/lib/session/checklist-requirements";

describe("resolveChecklistRequirements", () => {
  it("requires full proctoring checklist when anti-cheating is enabled", () => {
    const req = resolveChecklistRequirements({
      antiCheatingEnabled: true,
      isPractice: false,
      voiceEnabled: true,
      chatEnabled: true,
    });
    assert.deepEqual(req, { camera: true, microphone: true, screen: true });
    assert.equal(
      isChecklistItemRequired("screen", req, true, false),
      true,
    );
  });

  it("practice voice requires microphone only", () => {
    const req = resolveChecklistRequirements({
      antiCheatingEnabled: false,
      isPractice: true,
      voiceEnabled: true,
      chatEnabled: false,
    });
    assert.deepEqual(req, { camera: false, microphone: true, screen: false });
    assert.equal(hasChecklistStep(req), true);
    assert.equal(
      isChecklistItemRequired("microphone", req, false, true),
      true,
    );
    assert.equal(isChecklistItemRequired("camera", req, false, true), false);
  });

  it("practice voice-first requires mic only when chat is enabled internally", () => {
    const req = resolveChecklistRequirements({
      antiCheatingEnabled: false,
      isPractice: true,
      voiceEnabled: true,
      chatEnabled: true,
    });
    assert.deepEqual(req, { camera: false, microphone: true, screen: false });
    assert.equal(hasChecklistStep(req), true);
  });
});
