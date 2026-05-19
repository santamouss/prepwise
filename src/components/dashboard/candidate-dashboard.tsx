"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPracticeScore,
  formatSessionDate,
  formatTotalPracticeTime,
} from "@/lib/practice/format";
import { formatPracticeUsageSummary } from "@/lib/practice/format-usage";
import { trpc } from "@/lib/trpc/client";
import { ArrowRight, Clock, Mic, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";

export function CandidateDashboard() {
  const { profile } = useAuth();
  const { data, isLoading } = trpc.practice.getProgress.useQuery();
  const { data: monthlyUsage } = trpc.practice.getMonthlyUsage.useQuery();

  const firstName =
    profile?.name?.trim().split(/\s+/)[0] ||
    profile?.email?.split("@")[0] ||
    "there";

  const stats = data?.stats;
  const recentSessions = data?.recentSessions ?? [];

  const statCards = [
    {
      label: "Practice Completed",
      value: String(stats?.sessionsCompleted ?? 0),
      icon: Target,
    },
    {
      label: "Average Score",
      value: formatPracticeScore(stats?.averageScore ?? null),
      icon: Star,
    },
    {
      label: "Best Score",
      value: formatPracticeScore(stats?.bestScore ?? null),
      icon: Trophy,
    },
    {
      label: "Total Practice Time",
      value: formatTotalPracticeTime(stats?.totalPracticeSeconds ?? 0),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Ready to practice? Parker is here when you are.
        </p>
        {monthlyUsage && (
          <p className="mt-2 text-xs sm:text-sm font-medium text-foreground">
            {formatPracticeUsageSummary(monthlyUsage)}
          </p>
        )}
      </div>

      <Card className="overflow-hidden border-0 bg-[#3B6FF0] text-white shadow-md">
        <CardContent className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/90">
              <Mic className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">Practice</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-semibold">
              Start Voice Practice
            </h2>
            <p className="max-w-md text-xs sm:text-sm text-white/90">
              Speak through mock interviews tailored to your role — guided by Parker
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 bg-white text-[#3B6FF0] hover:bg-white/90 h-10 sm:h-11 text-xs sm:text-base w-full sm:w-auto"
          >
            <Link href="/practice">
              Start Voice Practice
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-0 px-3 sm:px-6 pb-3 sm:pb-6">
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              ) : (
                <p className="text-lg sm:text-2xl font-semibold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm sm:text-lg font-semibold text-foreground">Recent Practice</h2>
          {recentSessions.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
              <Link href="/my-sessions">View all</Link>
            </Button>
          )}
        </div>
        <Card>
          {isLoading ? (
            <CardContent className="space-y-3 py-4 sm:py-6">
              <Skeleton className="h-10 sm:h-12 w-full" />
              <Skeleton className="h-10 sm:h-12 w-full" />
            </CardContent>
          ) : recentSessions.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                No practice yet. Start your first mock interview with Parker.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 text-xs sm:text-sm h-8 sm:h-10">
                <Link href="/practice">Go to Practice</Link>
              </Button>
            </CardContent>
          ) : (
            <CardContent className="divide-y p-0">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionDate(session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-medium shrink-0">
                      {formatPracticeScore(session.score)}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-normal capitalize text-xs"
                    >
                      {session.status === "COMPLETED" ? "Completed" : "In progress"}
                    </Badge>
                    {session.status === "COMPLETED" && (
                      <Link
                        href={`/my-sessions/${session.id}`}
                        className="text-xs sm:text-sm font-medium text-[#3B6FF0] hover:underline shrink-0"
                      >
                        Feedback
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
