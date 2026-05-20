import { BlogPostContent } from "@/components/marketing/blog-post-content";
import { BlogMarketingShell } from "@/components/marketing/blog-marketing-shell";
import { MARKETING_BLOG, MARKETING_PRACTICE } from "@/components/marketing/marketing-links";
import { formatBlogDate, getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {};
  }

  return {
    title: {
      absolute: `${post.title} | ParkerHero`,
    },
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `${MARKETING_BLOG}/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  return (
    <BlogMarketingShell activeNav="blog">
      <article className="pk-container pk-blog-post-wrap">
        <Link href={MARKETING_BLOG} className="pk-blog-back">
          ← Back to blog
        </Link>

        <header className="pk-blog-post-head">
          <div className="pk-blog-card-meta">
            <span className="pk-blog-card-category">{post.category}</span>
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          </div>
          <h1>{post.title}</h1>
          <p className="pk-blog-post-byline">By {post.author}</p>
        </header>

        <BlogPostContent slug={post.slug} title={post.title} content={post.content} />

        <aside className="pk-blog-cta">
          <p>Ready to practice? Try a free mock interview with Parker →</p>
          <Link href={MARKETING_PRACTICE} className="pk-btn pk-btn-primary">
            Start free practice
          </Link>
        </aside>
      </article>
    </BlogMarketingShell>
  );
}
