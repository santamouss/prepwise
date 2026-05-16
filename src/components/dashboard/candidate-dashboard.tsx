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
import { trpc } from "@/lib/trpc/client";
import { ArrowRight, Clock, Mic, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";

export function CandidateDashboard() {
  const { profile } = useAuth();
  const { data, isLoading } = trpc.practice.getProgress.useQuery();

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready to practice? Parker is here when you are.
        </p>
      </div>

      <Card className="overflow-hidden border-0 bg-[#3B6FF0] text-white shadow-md">
        <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/90">
              <Mic className="h-5 w-5" />
              <span className="text-sm font-medium">Practice</span>
            </div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              Start a Practice Interview
            </h2>
            <p className="max-w-md text-sm text-white/90">
              Mock interviews tailored to your role — guided by Parker
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 bg-white text-[#3B6FF0] hover:bg-white/90"
          >
            <Link href="/practice">
              Start Practicing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-semibold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Practice</h2>
          {recentSessions.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/my-sessions">View all</Link>
            </Button>
          )}
        </div>
        <Card>
          {isLoading ? (
            <CardContent className="space-y-3 py-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          ) : recentSessions.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No practice yet. Start your first mock interview with Parker.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/practice">Go to Practice</Link>
              </Button>
            </CardContent>
          ) : (
            <CardContent className="divide-y p-0">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSessionDate(session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatPracticeScore(session.score)}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-normal capitalize"
                    >
                      {session.status === "COMPLETED" ? "Completed" : "In progress"}
                    </Badge>
                    {session.status === "COMPLETED" && (
                      <Link
                        href={`/my-sessions/${session.id}`}
                        className="text-sm font-medium text-[#3B6FF0] hover:underline"
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
