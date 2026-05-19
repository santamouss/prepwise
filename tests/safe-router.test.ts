import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  locationHref,
  pathsEqual,
  stripSearchParams,
} from "../src/lib/navigation/safe-router";

describe("safe-router", () => {
  it("locationHref normalizes pathname and search", () => {
    assert.equal(locationHref("/practice", "autoStart=true"), "/practice?autoStart=true");
    assert.equal(locationHref("/practice", "?autoStart=true"), "/practice?autoStart=true");
    assert.equal(locationHref("/dashboard", ""), "/dashboard");
  });

  it("pathsEqual treats matching paths as equal", () => {
    assert.equal(
      pathsEqual("/practice", "autoStart=true", "/practice?autoStart=true"),
      true,
    );
    assert.equal(
      pathsEqual("/practice", new URLSearchParams("autoStart=true"), "/practice?autoStart=true"),
      true,
    );
    assert.equal(
      pathsEqual("/practice", "autoStart=true", "/practice"),
      false,
    );
    assert.equal(
      pathsEqual("/dashboard", "", "/dashboard"),
      true,
    );
  });

  it("stripSearchParams removes keys", () => {
    assert.equal(
      stripSearchParams("/practice", new URLSearchParams("autoStart=true&foo=1"), [
        "autoStart",
      ]),
      "/practice?foo=1",
    );
    assert.equal(
      stripSearchParams("/practice", new URLSearchParams("autoStart=true"), ["autoStart"]),
      "/practice",
    );
  });
});
