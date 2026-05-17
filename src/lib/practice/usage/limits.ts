import type { PracticeMonthlyUsage } from "@/lib/practice/usage/types";

export function canStartPracticeSession(usage: PracticeMonthlyUsage): boolean {
  if (usage.isUnlimited) return true;
  if (usage.limit === null) return true;
  return usage.used < usage.limit;
}
