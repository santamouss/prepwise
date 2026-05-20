import { categories, getCategoryArticles } from "@/content/docs";
import { getAllPostSummaries } from "@/lib/blog/posts";
import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://parker.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getAllPostSummaries();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1.0 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/docs`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const docsPages: MetadataRoute.Sitemap = categories.flatMap((category) => {
    const categoryEntry: MetadataRoute.Sitemap[number] = {
      url: `${siteUrl}/docs/${category.slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    };

    const articleEntries = getCategoryArticles(category.slug).map(
      (article): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}/docs/${category.slug}/${article.slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
      })
    );

    return [categoryEntry, ...articleEntries];
  });

  return [...staticPages, ...blogPages, ...docsPages];
}
