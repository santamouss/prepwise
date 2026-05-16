"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Clock, Mic, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";

function formatPracticeTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function CandidateDashboard() {
  const { profile } = useAuth();

  const firstName =
    profile?.name?.trim().split(/\s+/)[0] ||
    profile?.email?.split("@")[0] ||
    "there";

  const sessionsCompleted = 0;
  const averageScore: number | null = null;
  const latestScore: number | null = null;
  const totalPracticeMinutes = 0;

  const stats = [
    {
      label: "Sessions Completed",
      value: String(sessionsCompleted),
      icon: Target,
    },
    {
      label: "Average Score",
      value: averageScore != null ? `${averageScore}%` : "N/A",
      icon: Star,
    },
    {
      label: "Latest Score",
      value: latestScore != null ? `${latestScore}%` : "N/A",
      icon: Trophy,
    },
    {
      label: "Total Practice Time",
      value: formatPracticeTime(totalPracticeMinutes),
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
          Ready to practice? Let&apos;s get started.
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
              AI-powered mock interviews tailored to your role
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
        {stats.map((stat) => (
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Recent Practice Sessions
        </h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No sessions yet. Start your first practice interview.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/practice">Go to Practice</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
