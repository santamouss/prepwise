"use client";

import { Check, Link2, Linkedin } from "lucide-react";
import { useCallback, useState } from "react";

type BlogShareButtonsProps = {
  title: string;
  variant?: "sidebar" | "inline";
};

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function BlogShareButtons({ title, variant = "sidebar" }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const buttonClass =
    variant === "inline"
      ? "pk-blog-share-btn pk-blog-share-btn--inline"
      : "pk-blog-share-btn";

  return (
    <div className={variant === "inline" ? "pk-blog-share-inline" : "pk-blog-share"}>
      {variant === "sidebar" ? (
        <p className="pk-blog-share-label">Share this article</p>
      ) : (
        <span className="pk-blog-share-inline-label">Share this article:</span>
      )}
      <div className="pk-blog-share-actions">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label="Share on X"
        >
          <XIcon />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-[18px] w-[18px]" />
        </a>
        <button type="button" className={buttonClass} onClick={copyLink} aria-label="Copy link">
          {copied ? <Check className="h-[18px] w-[18px]" /> : <Link2 className="h-[18px] w-[18px]" />}
        </button>
        {copied ? <span className="pk-blog-share-copied">Copied!</span> : null}
      </div>
    </div>
  );
}
