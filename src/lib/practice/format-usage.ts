import type { PracticeMonthlyUsage } from "@/lib/practice/usage/get-usage";

export function formatPracticeUsageSummary(usage: PracticeMonthlyUsage): string {
  if (usage.isUnlimited) {
    return `${usage.used} practice session${usage.used === 1 ? "" : "s"} used this month`;
  }
  return `${usage.used} of ${usage.limit} practice sessions used this month`;
}

export function formatPracticeRemaining(usage: PracticeMonthlyUsage): string | null {
  if (usage.isUnlimited) return null;
  if (usage.remaining === null || usage.limit === null) return null;
  if (usage.remaining === 0) {
    return "No practice sessions remaining this month";
  }
  return `${usage.remaining} practice session${usage.remaining === 1 ? "" : "s"} remaining this month`;
}
