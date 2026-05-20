import Link from "next/link";
import { MARKETING_PRACTICE } from "./marketing-links";

export function BlogBottomBanner() {
  return (
    <div className="pk-blog-bottom-banner">
      <p className="pk-blog-bottom-banner-text">Ready to practice this out loud?</p>
      <Link href={MARKETING_PRACTICE} className="pk-btn pk-blog-bottom-banner-btn">
        Start free practice →
      </Link>
    </div>
  );
}
