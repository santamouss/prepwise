import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBlogDate,
  getAllPostSlugs,
  getAllPostSummaries,
  getPostBySlug,
} from "../src/lib/blog/posts";

const PARKER_CTA_SNIPPET = "Practice Your Answer With Parker";
const MIN_INTERVIEW_POSTS = 19;

test("blog loads posts with required frontmatter", () => {
  const posts = getAllPostSummaries();
  assert.ok(posts.length >= MIN_INTERVIEW_POSTS + 3);

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

test("interview-question posts include required slugs", () => {
  const slugs = new Set(getAllPostSlugs());
  const required = [
    "how-to-answer-greatest-weakness",
    "how-to-answer-why-do-you-want-to-work-here",
    "how-to-answer-do-you-have-any-questions",
  ];
  for (const slug of required) {
    assert.ok(slugs.has(slug), `missing post: ${slug}`);
  }
});

test("getPostBySlug returns markdown with Parker CTA section", () => {
  const post = getPostBySlug("how-to-answer-greatest-weakness");
  assert.ok(post);
  assert.match(post.content, /greatest weakness/i);
  assert.match(post.content, /Practice Your Answer With Parker/);
  assert.match(post.content, /https:\/\/parkerhero\.com\/practice/);
  assert.equal(post.category, "interview-questions");
  assert.equal(post.author, "Parker Team");
});

test("getPostBySlug returns markdown content for legacy post", () => {
  const post = getPostBySlug("tell-me-about-yourself-interview-answer");
  assert.ok(post);
  assert.match(post.content, /present → past → future/i);
});

test("formatBlogDate renders readable US date", () => {
  assert.equal(formatBlogDate("2025-05-19"), "May 19, 2025");
});
