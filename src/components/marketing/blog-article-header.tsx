import { formatCategoryLabel } from "@/lib/blog/categories";
import { formatReadingTime } from "@/lib/blog/reading-time";
import { formatBlogDate } from "@/lib/blog/format-date";

type BlogArticleHeaderProps = {
  category: string;
  title: string;
  author: string;
  date: string;
  readingTimeMinutes: number;
};

export function BlogArticleHeader({
  category,
  title,
  author,
  date,
  readingTimeMinutes,
}: BlogArticleHeaderProps) {
  return (
    <header className="pk-blog-article-head">
      <span className="pk-blog-category-badge">{formatCategoryLabel(category)}</span>
      <h1 className="pk-blog-article-title">{title}</h1>
      <p className="pk-blog-article-meta">
        By {author} · {formatBlogDate(date)} · {formatReadingTime(readingTimeMinutes)}
      </p>
      <hr className="pk-blog-article-divider" />
    </header>
  );
}
