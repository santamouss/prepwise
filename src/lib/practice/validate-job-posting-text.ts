/** Minimum meaningful length for a job posting body extracted from a URL. */
export const MIN_JOB_POSTING_TEXT_LENGTH = 150;

const BLOCKED_PAGE_PATTERNS: RegExp[] = [
  /sign\s*in/i,
  /log\s*in/i,
  /join\s+linkedin/i,
  /authwall/i,
  /captcha/i,
  /access denied/i,
  /please enable cookies/i,
  /security verification/i,
  /unusual activity/i,
  /robot check/i,
];

export type JobPostingTextValidation =
  | { ok: true }
  | { ok: false; reason: "too_short" | "blocked_page" };

export function validateJobPostingExtractedText(text: string): JobPostingTextValidation {
  const trimmed = text.trim();
  if (trimmed.length < MIN_JOB_POSTING_TEXT_LENGTH) {
    return { ok: false, reason: "too_short" };
  }

  const blockedMatches = BLOCKED_PAGE_PATTERNS.filter((pattern) =>
    pattern.test(trimmed),
  ).length;

  if (blockedMatches >= 2) {
    return { ok: false, reason: "blocked_page" };
  }

  if (trimmed.length < 500 && blockedMatches >= 1) {
    return { ok: false, reason: "blocked_page" };
  }

  return { ok: true };
}

export function isLinkedInJobUrl(url: string): boolean {
  try {
    return new URL(url.trim()).hostname.toLowerCase().includes("linkedin.com");
  } catch {
    return /linkedin\.com/i.test(url);
  }
}

export function jobPostingFetchErrorMessage(url: string): string {
  if (isLinkedInJobUrl(url)) {
    return "LinkedIn often blocks automated fetching. Paste the job description below for best results.";
  }
  return "We couldn't read this job post. LinkedIn and some job boards block automated access. Please paste the job description below.";
}
