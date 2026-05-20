import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { BlogPost, BlogPostFrontmatter, BlogPostSummary } from "./types";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function parseFrontmatter(data: Record<string, unknown>, fileSlug: string): BlogPostFrontmatter {
  const required = [
    "title",
    "date",
    "slug",
    "category",
    "excerpt",
    "author",
    "description",
  ] as const;

  for (const key of required) {
    if (typeof data[key] !== "string" || !data[key].trim()) {
      throw new Error(`Blog post "${fileSlug}" is missing frontmatter: ${key}`);
    }
  }

  const slug = String(data.slug).trim();
  if (slug !== fileSlug) {
    throw new Error(
      `Blog post "${fileSlug}" has slug "${slug}" in frontmatter; they must match.`,
    );
  }

  return {
    title: String(data.title).trim(),
    date: String(data.date).trim(),
    slug,
    category: String(data.category).trim(),
    excerpt: String(data.excerpt).trim(),
    keywords: normalizeKeywords(data.keywords),
    author: String(data.author).trim(),
    description: String(data.description).trim(),
  };
}

function readPostFile(filename: string): BlogPost {
  const fileSlug = filename.replace(/\.md$/, "");
  const filePath = path.join(BLOG_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = parseFrontmatter(data as Record<string, unknown>, fileSlug);

  return {
    ...frontmatter,
    content: content.trim(),
  };
}

function listMarkdownFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

export function getAllPosts(): BlogPost[] {
  return listMarkdownFiles()
    .map(readPostFile)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getAllPostSummaries(): BlogPostSummary[] {
  return getAllPosts().map(({ content: _content, ...summary }) => summary);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const filename = `${slug}.md`;
  if (!listMarkdownFiles().includes(filename)) {
    return undefined;
  }
  return readPostFile(filename);
}

export function getAllPostSlugs(): string[] {
  return getAllPosts().map((post) => post.slug);
}

export function formatBlogDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return isoDate;
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
