"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Star, Target, TrendingUp } from "lucide-react";

const PLACEHOLDER_STATS = [
  { label: "Sessions Completed", value: "0", icon: Target },
  { label: "Average Score", value: "N/A", icon: Star },
  { label: "Latest Score", value: "N/A", icon: TrendingUp },
  { label: "Total Practice Time", value: "—", icon: Clock },
];

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Progress
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track how your interview skills improve over time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLACEHOLDER_STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Complete practice sessions to unlock charts and trends here.
        </CardContent>
      </Card>
    </div>
  );
}
