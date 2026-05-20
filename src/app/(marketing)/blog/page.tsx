import { BlogIndexClient, type BlogIndexPost } from "@/components/marketing/blog-index-client";
import { BlogMarketingShell } from "@/components/marketing/blog-marketing-shell";
import { estimateReadingTime } from "@/lib/blog/reading-time";
import { getAllPosts } from "@/lib/blog/posts";
import { MARKETING_BLOG } from "@/components/marketing/marketing-links";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Interview Prep Blog | ParkerHero",
  },
  description:
    "Guides, tips, and sample answers to help you practice interviews and land the job.",
  alternates: {
    canonical: MARKETING_BLOG,
  },
};

export default function BlogIndexPage() {
  const posts: BlogIndexPost[] = getAllPosts().map((post) => {
    const { content, ...summary } = post;
    return {
      ...summary,
      readingTimeMinutes: estimateReadingTime(content),
    };
  });

  return (
    <BlogMarketingShell activeNav="blog">
      <BlogIndexClient posts={posts} />
    </BlogMarketingShell>
  );
}
