"use client";

import { BlogCardThumbnail } from "@/components/marketing/blog-card-thumbnail";
import {
  BLOG_FILTER_TABS,
  formatCategoryLabel,
  getPostFilterGroup,
  type BlogFilterId,
} from "@/lib/blog/categories";
import { formatBlogDate } from "@/lib/blog/format-date";
import { formatReadingTime } from "@/lib/blog/reading-time";
import type { BlogPostSummary } from "@/lib/blog/types";
import Link from "next/link";
import { useMemo, useState } from "react";

export type BlogIndexPost = BlogPostSummary & {
  readingTimeMinutes: number;
};

type BlogIndexClientProps = {
  posts: BlogIndexPost[];
};

export function BlogIndexClient({ posts }: BlogIndexClientProps) {
  const [activeFilter, setActiveFilter] = useState<BlogFilterId>("all");

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") return posts;
    return posts.filter((post) => getPostFilterGroup(post) === activeFilter);
  }, [activeFilter, posts]);

  return (
    <div className="pk-container pk-blog-index">
      <header className="pk-blog-index-hero">
        <h1>Interview Prep Blog</h1>
        <p>Guides, tips, and sample answers to help you practice and land the job</p>
      </header>

      <div className="pk-blog-filters" role="tablist" aria-label="Filter blog posts">
        {BLOG_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === tab.id}
            className={
              activeFilter === tab.id ? "pk-blog-filter-tab is-active" : "pk-blog-filter-tab"
            }
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="pk-blog-empty">
          <h2>No posts in this category yet</h2>
          <p>Try another filter or check back soon.</p>
        </div>
      ) : (
        <div className="pk-blog-grid pk-blog-grid--index">
          {filteredPosts.map((post) => (
            <article key={post.slug} className="pk-blog-card">
              <Link href={`/blog/${post.slug}`} className="pk-blog-card-thumb-link">
                <BlogCardThumbnail slug={post.slug} title={post.title} />
              </Link>
              <div className="pk-blog-card-body">
                <div className="pk-blog-card-meta">
                  <span className="pk-blog-category-badge pk-blog-category-badge--sm">
                    {formatCategoryLabel(post.category)}
                  </span>
                  <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                  <span className="pk-blog-card-reading-time">
                    {formatReadingTime(post.readingTimeMinutes)}
                  </span>
                </div>
                <h2>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="pk-blog-card-excerpt">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="pk-blog-card-link">
                  Read article →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
