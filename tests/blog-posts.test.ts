import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBlogDate,
  getAllPostSlugs,
  getAllPostSummaries,
  getPostBySlug,
} from "../src/lib/blog/posts";

test("blog loads three posts with required frontmatter", () => {
  const posts = getAllPostSummaries();
  assert.equal(posts.length, 3);

  for (const post of posts) {
    assert.ok(post.title.length > 0);
    assert.ok(post.slug.length > 0);
    assert.ok(post.category.length > 0);
    assert.ok(post.excerpt.length > 0);
    assert.ok(post.author.length > 0);
    assert.ok(post.description.length > 0);
    assert.ok(!Number.isNaN(Date.parse(post.date)));
  }
});

test("getPostBySlug returns markdown content for known slug", () => {
  const post = getPostBySlug("tell-me-about-yourself-interview-answer");
  assert.ok(post);
  assert.match(post.content, /present → past → future/i);
  assert.equal(post.slug, "tell-me-about-yourself-interview-answer");
});

test("getAllPostSlugs matches markdown filenames", () => {
  const slugs = getAllPostSlugs();
  assert.deepEqual(
    [...slugs].sort(),
    [
      "mock-interview-vs-interview-coach",
      "scale-ai-forward-deployed-engineer-interview",
      "tell-me-about-yourself-interview-answer",
    ].sort(),
  );
});

test("formatBlogDate renders readable US date", () => {
  assert.equal(formatBlogDate("2026-05-12"), "May 12, 2026");
});
