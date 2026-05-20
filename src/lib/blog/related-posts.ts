import { getAllPosts } from "./posts";
import type { BlogPostSummary } from "./types";

export function getRelatedPosts(
  currentSlug: string,
  category: string,
  limit = 3,
): BlogPostSummary[] {
  const all = getAllPosts()
    .filter((post) => post.slug !== currentSlug)
    .map(({ content: _content, ...summary }) => summary);

  const sameCategory = all.filter((post) => post.category === category);
  const other = all.filter((post) => post.category !== category);

  const combined = [...sameCategory, ...other];
  return combined.slice(0, limit);
}
