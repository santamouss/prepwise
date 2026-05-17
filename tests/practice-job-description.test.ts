import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCombinedJobDescriptionText } from "../src/lib/practice/job-description-context";

describe("buildCombinedJobDescriptionText", () => {
  it("returns undefined when no sources are provided", () => {
    assert.equal(buildCombinedJobDescriptionText(), undefined);
    assert.equal(buildCombinedJobDescriptionText("", ""), undefined);
  });

  it("combines pasted and URL sections", () => {
    const combined = buildCombinedJobDescriptionText(
      "Pasted requirements",
      "URL requirements",
    );
    assert.ok(combined?.includes("Pasted requirements"));
    assert.ok(combined?.includes("--- From job posting URL ---"));
    assert.ok(combined?.includes("URL requirements"));
  });
});
