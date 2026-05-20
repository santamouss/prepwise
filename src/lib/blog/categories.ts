import type { BlogPostSummary } from "./types";

export const BLOG_FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "interview-questions", label: "Interview Questions" },
  { id: "role-prep", label: "Role Prep" },
  { id: "interview-strategy", label: "Interview Strategy" },
  { id: "ai-practice", label: "AI Practice" },
] as const;

export type BlogFilterId = (typeof BLOG_FILTER_TABS)[number]["id"];

export function getPostFilterGroup(post: Pick<BlogPostSummary, "slug" | "category">): BlogFilterId {
  const slug = post.slug;

  if (
    slug.includes("ai-interview") ||
    slug.includes("coach-mode") ||
    slug.includes("voice-interview") ||
    slug.includes("how-ai-interview") ||
    slug.includes("mock-interview-vs")
  ) {
    return "ai-practice";
  }

  if (
    slug.includes("how-to-prepare-for") ||
    slug.includes("startup-interview-vs") ||
    slug.includes("scale-ai-forward")
  ) {
    return "role-prep";
  }

  if (slug.includes("how-to-answer") || slug === "tell-me-about-yourself-interview-answer") {
    return "interview-questions";
  }

  if (post.category === "Product") return "ai-practice";
  if (post.category === "Role Guides") return "role-prep";
  if (post.category === "Behavioral") return "interview-questions";

  return "interview-strategy";
}

export function formatCategoryLabel(category: string): string {
  return category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
