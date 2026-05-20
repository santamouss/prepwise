"use client";

import type { BlogHeading } from "@/lib/blog/headings";
import { useEffect, useState } from "react";

type BlogTableOfContentsProps = {
  headings: BlogHeading[];
};

export function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="pk-blog-toc" aria-label="Table of contents">
      <p className="pk-blog-toc-title">In this article</p>
      <ol className="pk-blog-toc-list">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={activeId === heading.id ? "pk-blog-toc-link is-active" : "pk-blog-toc-link"}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
