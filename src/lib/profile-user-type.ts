export type ProfileUserType = "candidate" | "recruiter";

export function isProfileUserType(
  value: string | null | undefined,
): value is ProfileUserType {
  return value === "candidate" || value === "recruiter";
}
