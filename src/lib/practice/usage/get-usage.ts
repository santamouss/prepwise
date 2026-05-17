import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCalendarMonthBillingPeriod } from "@/lib/practice/usage/billing-period";
import {
  getPracticePlanLimit,
  normalizePracticePlan,
  PRACTICE_SESSION_COMPLETED_EVENT,
} from "@/lib/practice/usage/constants";
import type { PracticeMonthlyUsage } from "@/lib/practice/usage/types";

export type { PracticeMonthlyUsage } from "@/lib/practice/usage/types";

export async function getPracticeMonthlyUsage(
  userId: string,
  practicePlan?: string | null,
): Promise<PracticeMonthlyUsage> {
  const plan = normalizePracticePlan(practicePlan);
  const limit = getPracticePlanLimit(plan);
  const period = getCalendarMonthBillingPeriod();

  const { count, error } = await supabaseAdmin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", PRACTICE_SESSION_COMPLETED_EVENT)
    .eq("billing_period_start", period.startIso);

  if (error) {
    throw new Error(`Failed to load practice usage: ${error.message}`);
  }

  const used = count ?? 0;
  const isUnlimited = limit === null;
  const remaining =
    limit === null ? null : Math.max(0, limit - used);

  return {
    plan,
    used,
    limit,
    remaining,
    billingPeriodStart: period.startIso,
    billingPeriodEnd: period.endIso,
    isUnlimited,
  };
}
