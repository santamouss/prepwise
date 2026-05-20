export type BlogPostFrontmatter = {
  title: string;
  date: string;
  slug: string;
  category: string;
  excerpt: string;
  keywords: string[];
  author: string;
  description: string;
};

export type BlogPost = BlogPostFrontmatter & {
  content: string;
};

export type BlogPostSummary = BlogPostFrontmatter;
