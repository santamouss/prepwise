export type BillingPeriod = {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
};

/** Calendar month in UTC (until Stripe subscription periods are wired). */
export function getCalendarMonthBillingPeriod(now = new Date()): BillingPeriod {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
