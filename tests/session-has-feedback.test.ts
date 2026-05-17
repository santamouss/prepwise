import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasSessionFeedback } from "../src/lib/session/session-has-feedback";

describe("hasSessionFeedback", () => {
  it("detects non-empty summary", () => {
    assert.equal(hasSessionFeedback({ summary: "Strong candidate" }), true);
  });

  it("detects non-empty themes", () => {
    assert.equal(
      hasSessionFeedback({ themes: ["communication", "leadership"] }),
      true,
    );
  });

  it("detects question evaluations", () => {
    assert.equal(
      hasSessionFeedback({
        insights: { questionEvaluations: [{ question: "Q1", score: 4 }] },
      }),
      true,
    );
  });

  it("detects keyInsights and researchFindings", () => {
    assert.equal(
      hasSessionFeedback({
        insights: { keyInsights: ["Clear communicator"] },
      }),
      true,
    );
    assert.equal(
      hasSessionFeedback({
        insights: {
          researchFindings: [{ topic: "Background", finding: "Relevant" }],
        },
      }),
      true,
    );
  });

  it("detects legacy insights array", () => {
    assert.equal(hasSessionFeedback({ insights: ["insight one"] }), true);
  });

  it("detects toneAnalysis object", () => {
    assert.equal(
      hasSessionFeedback({
        insights: { toneAnalysis: { overall: "Professional" } },
      }),
      true,
    );
  });

  it("returns false when no report fields are present", () => {
    assert.equal(hasSessionFeedback({}), false);
    assert.equal(hasSessionFeedback({ summary: "  " }), false);
    assert.equal(hasSessionFeedback({ insights: { keyInsights: [] } }), false);
  });
});
