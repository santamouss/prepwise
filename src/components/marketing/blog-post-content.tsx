import { stripTrailingParkerCta } from "@/lib/blog/headings";
import { getImagesForPost } from "@/lib/blog/blog-images";
import { splitMarkdownForMiddleImage } from "@/lib/blog/split-markdown";
import { BlogMarkdown } from "@/components/marketing/blog-markdown";
import { BlogPostImage } from "@/components/marketing/blog-post-image";

type BlogPostContentProps = {
  slug: string;
  title: string;
  content: string;
  className?: string;
  stripTrailingCta?: boolean;
};

export function BlogPostContent({
  slug,
  title,
  content,
  className = "pk-blog-prose pk-blog-prose--editorial",
  stripTrailingCta = true,
}: BlogPostContentProps) {
  const body = stripTrailingCta ? stripTrailingParkerCta(content) : content;
  const [topImage, middleImage] = getImagesForPost(slug);
  const [firstHalf, secondHalf] = splitMarkdownForMiddleImage(body);
  const headingIdsSeen = new Set<string>();

  return (
    <>
      <BlogPostImage src={topImage} alt={`${title} illustration`} variant="top" />
      <div className={className}>
        <BlogMarkdown content={firstHalf} headingIdsSeen={headingIdsSeen} />
        {secondHalf ? (
          <>
            <BlogPostImage
              src={middleImage}
              alt={`${title} interview tips`}
              variant="middle"
            />
            <BlogMarkdown content={secondHalf} headingIdsSeen={headingIdsSeen} />
          </>
        ) : null}
      </div>
    </>
  );
}
