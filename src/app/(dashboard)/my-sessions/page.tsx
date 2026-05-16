"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatPracticeScore,
  formatSessionDate,
  formatSessionDuration,
} from "@/lib/practice/format";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ArrowRight, MessageSquare, Mic } from "lucide-react";
import Link from "next/link";

function ModeBadge({ mode }: { mode: string | null }) {
  const isVoice = mode === "VOICE";
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      {isVoice ? <Mic className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
      {isVoice ? "Voice" : "Chat"}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const completed = status === "COMPLETED";
  return (
    <Badge
      className={cn(
        "font-normal",
        completed
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "bg-amber-50 text-amber-700 hover:bg-amber-50",
      )}
    >
      {completed ? "Completed" : "In Progress"}
    </Badge>
  );
}

export default function MySessionsPage() {
  const { data, isLoading } = trpc.practice.listMySessions.useQuery();

  const sessions = data?.sessions ?? [];
  const stats = data?.stats ?? { total: 0, completed: 0, averageScore: null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your practice interview history
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Sessions", value: stats.total },
          { label: "Completed Sessions", value: stats.completed },
          {
            label: "Average Score",
            value: formatPracticeScore(stats.averageScore),
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
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-semibold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No practice sessions yet. Start your first mock interview.
              </p>
              <Button asChild className="mt-4 bg-[#3B6FF0] hover:bg-[#3B6FF0]/90">
                <Link href="/practice">
                  Start Practicing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mock Interview</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>{formatSessionDate(session.date)}</TableCell>
                    <TableCell>
                      {formatSessionDuration(
                        session.durationSeconds,
                        session.plannedMinutes,
                      )}
                    </TableCell>
                    <TableCell>{formatPracticeScore(session.score)}</TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      <ModeBadge mode={session.modeUsed} />
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "COMPLETED" ? (
                        <Link
                          href={`/my-sessions/${session.id}`}
                          className="text-sm font-medium text-[#3B6FF0] hover:underline"
                        >
                          View Report
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
