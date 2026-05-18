export type BillingPeriod = "monthly" | "yearly";

export type MarketingPlanId = "free" | "starter" | "pro";

export type MarketingPlan = {
  id: MarketingPlanId;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: string[];
  ctaLabel: string;
  recommended?: boolean;
};

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["3 sessions/month"],
    ctaLabel: "Start free",
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    yearlyPrice: 190,
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
    yearlyPrice: 390,
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

  if (billing === "yearly" && plan.yearlyPrice != null) {
    return { amount: `$${plan.yearlyPrice}`, period: "/year" };
  }

  if (plan.monthlyPrice != null) {
    return { amount: `$${plan.monthlyPrice}`, period: "/mo" };
  }

  return { amount: "—", period: "" };
}
