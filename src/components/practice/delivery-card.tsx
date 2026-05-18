"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionDeliveryInsights } from "@/lib/voice/delivery-analysis";
import { Gauge, MessageCircleWarning, Mic } from "lucide-react";

function paceLabel(wpm: number): string {
  if (wpm >= 170) return "Fast";
  if (wpm < 110) return "Slow";
  return "Steady";
}

export function DeliveryCard({
  delivery,
}: {
  delivery: SessionDeliveryInsights;
}) {
  const agg = delivery.aggregate;
  if (!agg && delivery.answers.length === 0) return null;

  const avgWpm = agg?.avgWordsPerMinute ?? delivery.answers[0]?.wordsPerMinute ?? 0;
  const fillers = agg?.totalFillerWords ?? 0;
  const hedging = agg?.totalHedgingPhrases ?? 0;
  const suggestion =
    agg?.topSuggestions?.[0] ??
    "Keep answers structured with a clear result or takeaway.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="h-4 w-4" />
          Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <DeliveryMetric
          icon={<Gauge className="h-4 w-4 text-primary" />}
          label="Pace"
          value={`~${avgWpm} WPM`}
          detail={paceLabel(avgWpm)}
        />
        <DeliveryMetric
          icon={<MessageCircleWarning className="h-4 w-4 text-amber-600" />}
          label="Filler words"
          value={String(fillers)}
          detail={fillers >= 3 ? "Consider trimming um/like/you know" : "Light filler use"}
        />
        <DeliveryMetric
          icon={<MessageCircleWarning className="h-4 w-4 text-muted-foreground" />}
          label="Confidence / hedging"
          value={String(hedging)}
          detail={
            hedging >= 2
              ? 'Phrases like "I think" / "maybe" showed up'
              : "Direct wording overall"
          }
        />
        <DeliveryMetric
          icon={<Mic className="h-4 w-4 text-secondary-600" />}
          label="Suggested improvement"
          detail={suggestion}
          className="sm:col-span-2"
        />
      </CardContent>
    </Card>
  );
}

function DeliveryMetric({
  icon,
  label,
  value,
  detail,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {value ? <p className="text-lg font-semibold">{value}</p> : null}
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
