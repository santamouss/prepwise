import assert from "node:assert/strict";
import test from "node:test";

import { formatPlanPrice, MARKETING_PLANS } from "../src/components/marketing/pricing-plans";

test("formatPlanPrice shows yearly prices when billing is yearly", () => {
  const starter = MARKETING_PLANS.find((p) => p.id === "starter")!;
  assert.deepEqual(formatPlanPrice(starter, "yearly"), {
    amount: "$190",
    period: "/year",
  });
});

test("formatPlanPrice shows monthly prices when billing is monthly", () => {
  const pro = MARKETING_PLANS.find((p) => p.id === "pro")!;
  assert.deepEqual(formatPlanPrice(pro, "monthly"), {
    amount: "$39",
    period: "/mo",
  });
});

test("formatPlanPrice shows zero for free plan", () => {
  const free = MARKETING_PLANS.find((p) => p.id === "free")!;
  assert.deepEqual(formatPlanPrice(free, "yearly"), {
    amount: "$0",
    period: "",
  });
});
