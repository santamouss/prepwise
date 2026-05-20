import { getImagesForPost } from "@/lib/blog/blog-images";
import { splitMarkdownForMiddleImage } from "@/lib/blog/split-markdown";
import { BlogMarkdown } from "@/components/marketing/blog-markdown";
import { BlogPostImage } from "@/components/marketing/blog-post-image";

type BlogPostContentProps = {
  slug: string;
  title: string;
  content: string;
  className?: string;
};

export function BlogPostContent({
  slug,
  title,
  content,
  className = "pk-blog-prose",
}: BlogPostContentProps) {
  const [topImage, middleImage] = getImagesForPost(slug);
  const [firstHalf, secondHalf] = splitMarkdownForMiddleImage(content);

  return (
    <>
      <BlogPostImage src={topImage} alt={`${title} illustration`} variant="top" />
      <div className={className}>
        <BlogMarkdown content={firstHalf} />
        {secondHalf ? (
          <>
            <BlogPostImage
              src={middleImage}
              alt={`${title} interview tips`}
              variant="middle"
            />
            <BlogMarkdown content={secondHalf} />
          </>
        ) : null}
      </div>
    </>
  );
}
