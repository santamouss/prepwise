import type { ProfileUserType } from "@/lib/profile-user-type";

export const CANDIDATE_ONLY_PATHS = ["/practice", "/my-sessions", "/progress"] as const;

/** Null/undefined user_type is treated as candidate while onboarding is skipped. */
export function getEffectiveUserType(
  userType: ProfileUserType | null | undefined,
): ProfileUserType {
  return userType === "recruiter" ? "recruiter" : "candidate";
}

export function isEffectiveCandidate(
  userType: ProfileUserType | null | undefined,
): boolean {
  return getEffectiveUserType(userType) === "candidate";
}

export const RECRUITER_ONLY_PREFIXES = [
  "/interviews",
  "/questions",
  "/candidates",
  "/organizations",
  "/usage",
  "/org/",
  "/projects",
  "/settings/members",
] as const;

export function isCandidateOnlyPath(pathname: string): boolean {
  return CANDIDATE_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isRecruiterOnlyPath(pathname: string): boolean {
  return RECRUITER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
