import { extractTextFromUrl } from "@/lib/ai/extract-document-text";
import { validateJobPostingExtractedText } from "@/lib/practice/validate-job-posting-text";

export type PracticeJobDescriptionInput = {
  pastedJobDescription?: string;
  jobDescriptionUrl?: string;
};

export type ResolvedPracticeJobDescription = {
  combined?: string;
  urlFetchFailed: boolean;
};

export function buildCombinedJobDescriptionText(
  pasted?: string,
  urlText?: string,
): string | undefined {
  const parts: string[] = [];
  const pastedTrimmed = pasted?.trim();
  if (pastedTrimmed) parts.push(pastedTrimmed);
  const urlTrimmed = urlText?.trim();
  if (urlTrimmed) {
    parts.push(`--- From job posting URL ---\n${urlTrimmed}`);
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export async function resolvePracticeJobDescription(
  input: PracticeJobDescriptionInput,
): Promise<ResolvedPracticeJobDescription> {
  let urlText: string | undefined;
  let urlFetchFailed = false;

  const url = input.jobDescriptionUrl?.trim();
  if (url) {
    try {
      const extracted = await extractTextFromUrl(url);
      const validation = validateJobPostingExtractedText(extracted);
      if (validation.ok) {
        urlText = extracted;
      } else {
        urlFetchFailed = true;
      }
    } catch {
      urlFetchFailed = true;
    }
  }

  return {
    combined: buildCombinedJobDescriptionText(
      input.pastedJobDescription,
      urlText,
    ),
    urlFetchFailed,
  };
}
