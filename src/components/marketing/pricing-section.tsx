"use client";

import Link from "next/link";
import { useState } from "react";
import { MARKETING_PRACTICE_REGISTER } from "./marketing-links";
import {
  formatPlanPrice,
  MARKETING_PLANS,
  type BillingPeriod,
  type MarketingPlan,
} from "./pricing-plans";

export function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("yearly");

  return (
    <section className="pk-section" id="pricing">
      <div className="pk-container">
        <div className="pk-section-head">
          <div className="pk-section-tag">Pricing</div>
          <h2>Start free. Upgrade when you&apos;re ready.</h2>
          <p>Practice as much as you need before the interview that matters.</p>
        </div>

        <div className="pk-pricing-toggle-wrap">
          <div className="pk-pricing-toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={`pk-pricing-toggle-option${billing === "monthly" ? " pk-pricing-toggle-option-active" : ""}`}
              aria-pressed={billing === "monthly"}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`pk-pricing-toggle-option${billing === "yearly" ? " pk-pricing-toggle-option-active" : ""}`}
              aria-pressed={billing === "yearly"}
              onClick={() => setBilling("yearly")}
            >
              Yearly
              <span className="pk-pricing-save">save 20%</span>
            </button>
            <span
              className="pk-pricing-toggle-indicator"
              data-billing={billing}
              aria-hidden
            />
          </div>
        </div>

        <div className="pk-pricing-grid">
          {MARKETING_PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>

        <div className="pk-pricing-cta">
          <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary">
            Start free practice
          </Link>
          <p className="pk-pricing-note">Cancel anytime. No credit card to start.</p>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ plan, billing }: { plan: MarketingPlan; billing: BillingPeriod }) {
  const { amount, period } = formatPlanPrice(plan, billing);
  const isFree = plan.id === "free";
  const featured = plan.recommended;

  return (
    <article
      className={
        featured ? "pk-price pk-price-featured pk-price-recommended" : "pk-price"
      }
    >
      {featured ? <div className="pk-price-ribbon">Recommended</div> : null}
      <div className="pk-price-name">{plan.name}</div>

      <div className="pk-price-amount-shell" aria-live="polite">
        <div key={`${plan.id}-${billing}`} className="pk-price-amount-inner">
          <div className="pk-price-amount">
            {amount}
            {period ? <span className="pk-price-per">{period}</span> : null}
          </div>
          {!isFree && billing === "yearly" && plan.monthlyPrice != null && (
            <p className="pk-price-billed">
              ${plan.monthlyPrice}/mo billed annually
            </p>
          )}
        </div>
      </div>

      <ul className="pk-price-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={MARKETING_PRACTICE_REGISTER}
        className={`pk-btn pk-price-cta ${featured ? "pk-btn-primary" : "pk-btn-secondary"}`}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg
      className="pk-price-check"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
