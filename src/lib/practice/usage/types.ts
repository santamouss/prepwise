import type { PracticePlanId } from "@/lib/practice/usage/constants";

export type PracticeMonthlyUsage = {
  plan: PracticePlanId;
  used: number;
  limit: number | null;
  remaining: number | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  isUnlimited: boolean;
};
