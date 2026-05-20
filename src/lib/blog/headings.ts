export type BlogHeading = {
  id: string;
  title: string;
};

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function uniqueHeadingId(text: string, seen: Set<string>): string {
  let id = slugifyHeading(text);
  if (!id) return "";

  let suffix = 2;
  const base = id;
  while (seen.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  seen.add(id);
  return id;
}

export function extractHeadingsFromMarkdown(content: string, limit = 8): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const seen = new Set<string>();
  const headingPattern = /^## (.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(content)) !== null) {
    const rawTitle = match[1]
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim();
    if (!rawTitle) continue;

    const id = uniqueHeadingId(rawTitle, seen);
    if (!id) continue;

    headings.push({ id, title: rawTitle });

    if (headings.length >= limit) break;
  }

  return headings;
}

export function stripTrailingParkerCta(content: string): string {
  const marker = "## Practice Your Answer With Parker";
  const idx = content.lastIndexOf(marker);
  if (idx === -1) return content;
  return content.slice(0, idx).trim();
}
