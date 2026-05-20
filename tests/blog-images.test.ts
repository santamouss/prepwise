import assert from "node:assert/strict";
import test from "node:test";

import { BLOG_IMAGES, getImagesForPost } from "../src/lib/blog/blog-images";

test("getImagesForPost returns deterministic pair for slug", () => {
  const a = getImagesForPost("how-to-answer-greatest-weakness");
  const b = getImagesForPost("how-to-answer-greatest-weakness");
  assert.deepEqual(a, b);
});

test("getImagesForPost returns two different images when possible", () => {
  const [first, second] = getImagesForPost("tell-me-about-yourself-interview-answer");
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first, second);
});

test("getImagesForPost only uses paths from BLOG_IMAGES", () => {
  const [first, second] = getImagesForPost("mock-interview-vs-interview-coach");
  assert.ok(BLOG_IMAGES.includes(first as (typeof BLOG_IMAGES)[number]));
  assert.ok(BLOG_IMAGES.includes(second as (typeof BLOG_IMAGES)[number]));
});
