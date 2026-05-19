import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

import { DEFAULT_CANDIDATE_PRACTICE_MODE } from "../src/lib/practice/practice-mode";

describe("candidate practice default mode", () => {
  it("defaults new practice setup to coach", () => {
    assert.equal(DEFAULT_CANDIDATE_PRACTICE_MODE, "coach");

    const pageSource = readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/practice/page.tsx"),
      "utf8",
    );
    assert.match(pageSource, /DEFAULT_CANDIDATE_PRACTICE_MODE/);
    assert.match(pageSource, /useState<PracticeMode>\(\s*DEFAULT_CANDIDATE_PRACTICE_MODE/);
    assert.match(pageSource, /value: "coach"/);
    assert.match(pageSource, /badge: "Recommended"/);
  });
});
