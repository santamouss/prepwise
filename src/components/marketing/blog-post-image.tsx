import Image from "next/image";

type BlogPostImageProps = {
  src: string;
  alt: string;
  variant?: "top" | "middle";
};

export function BlogPostImage({ src, alt, variant = "top" }: BlogPostImageProps) {
  if (!src) {
    return null;
  }

  return (
    <figure
      className={
        variant === "middle" ? "pk-blog-figure pk-blog-figure--middle" : "pk-blog-figure"
      }
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 720px"
        className="pk-blog-image"
        priority={variant === "top"}
      />
    </figure>
  );
}
