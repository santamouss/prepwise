import { uniqueHeadingId } from "@/lib/blog/headings";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement, useMemo, type ReactNode } from "react";

type BlogMarkdownProps = {
  content: string;
  className?: string;
  headingIdsSeen?: Set<string>;
};

function getTextFromChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string") return child;
      if (isValidElement(child)) return getTextFromChildren(child.props.children);
      return "";
    })
    .join("")
    .trim();
}

function createMarkdownComponents(seen: Set<string>): Components {
  return {
    h2: ({ children }) => {
      const text = getTextFromChildren(children);
      const id = uniqueHeadingId(text, seen);
      return <h2 id={id || undefined}>{children}</h2>;
    },
  };
}

export function BlogMarkdown({ content, className, headingIdsSeen }: BlogMarkdownProps) {
  const components = useMemo(() => {
    const seen = headingIdsSeen ?? new Set<string>();
    return createMarkdownComponents(seen);
  }, [content, headingIdsSeen]);

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
