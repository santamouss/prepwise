"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPracticeScore,
  formatTotalPracticeTime,
} from "@/lib/practice/format";
import { trpc } from "@/lib/trpc/client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: "12px",
};

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ProgressPage() {
  const { data, isLoading } = trpc.practice.getProgress.useQuery();

  const stats = data?.stats;
  const scoreTrend = data?.scoreTrend ?? [];
  const topThemes = data?.topThemes ?? [];
  const improvementAreas = data?.improvementAreas ?? [];

  const chartData = scoreTrend.map((point) => ({
    ...point,
    label: formatChartDate(point.date),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My Progress
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your improvement over time
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Sessions Completed",
            value: stats?.sessionsCompleted ?? 0,
          },
          {
            label: "Average Score",
            value: formatPracticeScore(stats?.averageScore ?? null),
          },
          {
            label: "Best Score",
            value: formatPracticeScore(stats?.bestScore ?? null),
          },
          {
            label: "Total Practice Time",
            value: formatTotalPracticeTime(stats?.totalPracticeSeconds ?? 0),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-semibold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score over time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : chartData.length < 2 ? (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">
              Complete more sessions to see your progress trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    typeof value === "number" ? `${value.toFixed(1)}/10` : "N/A",
                    "Score",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B6FF0"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3B6FF0" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Themes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : topThemes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Themes will appear after your first completed session
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topThemes.map((theme) => (
                  <Badge key={theme} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Improvement Areas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : improvementAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a session to see personalized feedback
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-foreground">
                {improvementAreas.map((area) => (
                  <li key={area} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B6FF0]" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
