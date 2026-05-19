import { isCandidateOnlyPath } from "@/lib/auth/user-type-routes";
import type { ProfileUserType } from "@/lib/profile-user-type";

/**
 * Recruiter dashboard tour (welcome, spotlight, checklist, celebration, compass).
 * Re-enable per surface by toggling these flags — no file deletion required.
 */
export const RECRUITER_DASHBOARD_TOUR_ENABLED = true;

/**
 * Interviewee session tour (preview walkthrough, how-it-works mock session, spotlight).
 * Disabled for all users while candidate practice is the primary flow.
 */
export const INTERVIEWEE_SESSION_TOUR_ENABLED = false;

/** Paths where recruiter dashboard tours must never appear. */
const RECRUITER_TOUR_BLOCKED_PATH_PREFIXES = [
  "/practice",
  "/my-sessions",
  "/progress",
  "/onboarding",
  "/i/",
] as const;

export function isRecruiterTourBlockedPath(pathname: string): boolean {
  if (isCandidateOnlyPath(pathname)) return true;
  return RECRUITER_TOUR_BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function isRecruiterDashboardTourEnabled(
  userType: ProfileUserType | null | undefined,
  pathname: string,
): boolean {
  if (!RECRUITER_DASHBOARD_TOUR_ENABLED) return false;
  if (userType !== "recruiter") return false;
  if (isRecruiterTourBlockedPath(pathname)) return false;
  return true;
}

export function isIntervieweeSessionTourEnabled(): boolean {
  return INTERVIEWEE_SESSION_TOUR_ENABLED;
}
