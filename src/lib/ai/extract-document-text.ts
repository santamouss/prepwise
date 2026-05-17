import * as cheerio from "cheerio";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text: string }>;

export const MAX_EXTRACT_TEXT_LENGTH = 15_000;

export function truncateExtractedText(text: string): string {
  if (text.length <= MAX_EXTRACT_TEXT_LENGTH) return text;
  return text.slice(0, MAX_EXTRACT_TEXT_LENGTH) + "\n\n[...truncated]";
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, img, video, audio, iframe, nav, footer, header").remove();

  const mainContent =
    $("main").text() ||
    $("article").text() ||
    $('[role="main"]').text() ||
    $("body").text();

  return mainContent
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text?.trim() ?? "";
  if (!text) {
    throw new Error("Could not extract text from the PDF");
  }
  return truncateExtractedText(text);
}

export async function extractTextFromUrl(url: string): Promise<string> {
  const targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    throw new Error("Invalid URL — must start with http:// or https://");
  }

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ParkerBot/1.0; +https://parker.app)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  let extractedText: string;

  if (contentType.includes("application/pdf")) {
    const buffer = Buffer.from(await res.arrayBuffer());
    extractedText = (await pdfParse(buffer)).text?.trim() ?? "";
  } else {
    extractedText = htmlToText(await res.text());
  }

  if (!extractedText) {
    throw new Error("Could not extract meaningful text from the URL");
  }

  return truncateExtractedText(extractedText);
}
