import { BlogArticleHeader } from "@/components/marketing/blog-article-header";
import { BlogBottomBanner } from "@/components/marketing/blog-bottom-banner";
import { BlogMarketingShell } from "@/components/marketing/blog-marketing-shell";
import { BlogPostContent } from "@/components/marketing/blog-post-content";
import { BlogPostSidebar } from "@/components/marketing/blog-post-sidebar";
import { BlogRelatedPosts } from "@/components/marketing/blog-related-posts";
import { BlogShareButtons } from "@/components/marketing/blog-share-buttons";
import { extractHeadingsFromMarkdown, stripTrailingParkerCta } from "@/lib/blog/headings";
import { estimateReadingTime } from "@/lib/blog/reading-time";
import { MARKETING_BLOG } from "@/components/marketing/marketing-links";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
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

  const readingTimeMinutes = estimateReadingTime(post.content);
  const articleBody = stripTrailingParkerCta(post.content);
  const headings = extractHeadingsFromMarkdown(articleBody);

  return (
    <BlogMarketingShell activeNav="blog">
      <div className="pk-container pk-blog-post-layout">
        <Link href={MARKETING_BLOG} className="pk-blog-back">
          ← Back to blog
        </Link>

        <div className="pk-blog-post-grid">
          <div className="pk-blog-post-main">
            <BlogArticleHeader
              category={post.category}
              title={post.title}
              author={post.author}
              date={post.date}
              readingTimeMinutes={readingTimeMinutes}
            />

            <BlogPostContent slug={post.slug} title={post.title} content={post.content} />

            <BlogBottomBanner />

            <div className="pk-blog-post-share-row">
              <BlogShareButtons title={post.title} variant="inline" />
            </div>
          </div>

          <div className="pk-blog-post-sidebar">
            <BlogPostSidebar headings={headings} title={post.title} />
          </div>
        </div>

        <BlogRelatedPosts currentSlug={post.slug} category={post.category} />
      </div>
    </BlogMarketingShell>
  );
}
