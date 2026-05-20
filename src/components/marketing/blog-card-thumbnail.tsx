import { getImagesForPost } from "@/lib/blog/blog-images";
import Image from "next/image";

type BlogCardThumbnailProps = {
  slug: string;
  title: string;
};

export function BlogCardThumbnail({ slug, title }: BlogCardThumbnailProps) {
  const [thumbnail] = getImagesForPost(slug);

  if (!thumbnail) {
    return <div className="pk-blog-card-thumb-placeholder" aria-hidden />;
  }

  return (
    <div className="pk-blog-card-thumb">
      <Image
        src={thumbnail}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 360px"
        className="pk-blog-card-thumb-image"
      />
      <span className="sr-only">{title}</span>
    </div>
  );
}
