import { BlogMarketingShell } from "@/components/marketing/blog-marketing-shell";
import { formatBlogDate, getAllPostSummaries } from "@/lib/blog/posts";
import { MARKETING_BLOG } from "@/components/marketing/marketing-links";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    absolute: "Blog | ParkerHero",
  },
  description:
    "Practical interview prep guides, answer frameworks, and coaching tips from ParkerHero.",
  alternates: {
    canonical: MARKETING_BLOG,
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostSummaries();

  return (
    <BlogMarketingShell activeNav="blog">
      <div className="pk-container">
        <header className="pk-blog-hero">
          <h1>Interview prep, without the fluff</h1>
          <p>
            Frameworks, examples, and practice strategies you can use before your next
            conversation with a hiring manager—or with Parker.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="pk-blog-empty">
            <h2>No posts yet</h2>
            <p>Check back soon for interview guides and coaching tips.</p>
          </div>
        ) : (
          <div className="pk-blog-grid">
            {posts.map((post) => (
              <article key={post.slug} className="pk-blog-card">
                <div className="pk-blog-card-meta">
                  <span className="pk-blog-card-category">{post.category}</span>
                  <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                </div>
                <h2>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="pk-blog-card-excerpt">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="pk-blog-card-link">
                  Read article →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </BlogMarketingShell>
  );
}
