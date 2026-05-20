import { getImagesForPost } from "@/lib/blog/blog-images";
import { formatCategoryLabel } from "@/lib/blog/categories";
import { getRelatedPosts } from "@/lib/blog/related-posts";
import Image from "next/image";
import Link from "next/link";

type BlogRelatedPostsProps = {
  currentSlug: string;
  category: string;
};

export function BlogRelatedPosts({ currentSlug, category }: BlogRelatedPostsProps) {
  const related = getRelatedPosts(currentSlug, category, 3);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className="pk-blog-related">
      <header className="pk-blog-related-head">
        <h2>Keep practicing</h2>
        <p>More interview prep from Parker</p>
      </header>
      <div className="pk-blog-related-grid">
        {related.map((post) => {
          const [thumbnail] = getImagesForPost(post.slug);
          return (
            <article key={post.slug} className="pk-blog-related-card">
              <Link href={`/blog/${post.slug}`} className="pk-blog-related-thumb-link">
                <div className="pk-blog-related-thumb">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="pk-blog-related-thumb-image"
                    />
                  ) : (
                    <div className="pk-blog-card-thumb-placeholder" aria-hidden />
                  )}
                </div>
              </Link>
              <div className="pk-blog-related-body">
                <span className="pk-blog-category-badge pk-blog-category-badge--sm">
                  {formatCategoryLabel(post.category)}
                </span>
                <h3>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="pk-blog-card-link">
                  Read article →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
