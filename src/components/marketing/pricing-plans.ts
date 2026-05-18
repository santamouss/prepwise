export type BillingPeriod = "monthly" | "yearly";

export type MarketingPlanId = "free" | "starter" | "pro";

export type MarketingPlan = {
  id: MarketingPlanId;
  name: string;
  /** Price shown when Monthly billing is selected */
  monthlyPrice: number | null;
  /** Per-month price shown when Yearly billing is selected (billed annually) */
  yearlyMonthlyPrice: number | null;
  features: string[];
  ctaLabel: string;
  recommended?: boolean;
};

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyMonthlyPrice: 0,
    features: ["3 sessions/month"],
    ctaLabel: "Start free",
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    yearlyMonthlyPrice: 15,
    recommended: true,
    features: [
      "25 sessions/month",
      "Coach Mode",
      "Delivery feedback",
      "Progress tracking",
    ],
    ctaLabel: "Upgrade to Starter",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 39,
    yearlyMonthlyPrice: 31,
    features: [
      "Unlimited sessions",
      "Advanced coaching",
      "Priority support",
      "Premium templates",
    ],
    ctaLabel: "Go Pro",
  },
];

export function formatPlanPrice(
  plan: MarketingPlan,
  billing: BillingPeriod,
): { amount: string; period: string } {
  if (plan.monthlyPrice === 0) {
    return { amount: "$0", period: "" };
  }

  if (billing === "yearly" && plan.yearlyMonthlyPrice != null) {
    return { amount: `$${plan.yearlyMonthlyPrice}`, period: "/mo" };
  }

  if (plan.monthlyPrice != null) {
    return { amount: `$${plan.monthlyPrice}`, period: "/mo" };
  }

  return { amount: "—", period: "" };
}
