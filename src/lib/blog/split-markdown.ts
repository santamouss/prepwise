/**
 * Split markdown into two halves for mid-article image placement.
 * Prefers paragraph boundaries; falls back to the first ## heading.
 */
export function splitMarkdownForMiddleImage(content: string): [string, string] {
  const trimmed = content.trim();
  if (!trimmed) {
    return ["", ""];
  }

  const blocks = trimmed.split(/\n\n+/).filter((block) => block.trim().length > 0);

  if (blocks.length >= 2) {
    const mid = Math.floor(blocks.length / 2);
    if (mid > 0 && mid < blocks.length) {
      return [blocks.slice(0, mid).join("\n\n"), blocks.slice(mid).join("\n\n")];
    }
  }

  const inlineH2 = trimmed.search(/\n## /);
  if (inlineH2 > 0) {
    return [trimmed.slice(0, inlineH2).trim(), trimmed.slice(inlineH2 + 1).trim()];
  }

  if (trimmed.startsWith("## ")) {
    const rest = trimmed.slice(3);
    const nextH2 = rest.search(/\n## /);
    if (nextH2 > 0) {
      const splitAt = nextH2 + 4;
      return [trimmed.slice(0, splitAt).trim(), trimmed.slice(splitAt).trim()];
    }
  }

  return [trimmed, ""];
}
