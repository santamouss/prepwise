/** Hardcoded blog illustration paths (from public/images/Blogs/). */
export const BLOG_IMAGES = [
  "/images/Blogs/Interview_prep_6.png",
  "/images/Blogs/interview.png",
  "/images/Blogs/interview_preparation.png",
  "/images/Blogs/interview_prep.png",
  "/images/Blogs/interview_prep_2.png",
  "/images/Blogs/interview_prep_3.png",
  "/images/Blogs/interview_prep_4.png",
  "/images/Blogs/interview_prep_5.png",
  "/images/Blogs/interview_struggle.png",
  "/images/Blogs/negociation.png",
  "/images/Blogs/practice.png",
  "/images/Blogs/preparation.png",
  "/images/Blogs/thinking.png",
] as const;

/**
 * Deterministic image pair per slug (hydration-safe — no Math.random()).
 */
export function getImagesForPost(
  slug: string,
  images: readonly string[] = BLOG_IMAGES,
): [string, string] {
  if (images.length === 0) {
    return ["", ""];
  }

  const hash = slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const firstIndex = hash % images.length;
  let secondIndex = (hash * 31 + 7) % images.length;

  if (secondIndex === firstIndex) {
    secondIndex = (hash * 31 + 8) % images.length;
  }
  if (secondIndex === firstIndex && images.length > 1) {
    secondIndex = (firstIndex + 1) % images.length;
  }

  return [images[firstIndex]!, images[secondIndex]!];
}
