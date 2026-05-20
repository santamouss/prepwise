"use client";

import type { BlogHeading } from "@/lib/blog/headings";
import Link from "next/link";
import { MARKETING_PRACTICE } from "./marketing-links";
import { BlogShareButtons } from "./blog-share-buttons";
import { BlogTableOfContents } from "./blog-table-of-contents";

type BlogPostSidebarProps = {
  headings: BlogHeading[];
  title: string;
};

export function BlogPostSidebar({ headings, title }: BlogPostSidebarProps) {
  return (
    <aside className="pk-blog-sidebar-inner">
      <BlogTableOfContents headings={headings} />

      <div className="pk-blog-sidebar-cta">
        <h2>Practice this answer with Parker</h2>
        <p>Run a free voice mock interview and get honest feedback</p>
        <Link href={MARKETING_PRACTICE} className="pk-btn pk-btn-primary pk-blog-sidebar-cta-btn">
          Start free practice →
        </Link>
      </div>

      <BlogShareButtons title={title} variant="sidebar" />
    </aside>
  );
}
