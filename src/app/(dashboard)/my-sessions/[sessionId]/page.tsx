"use client";

import { InterviewResults } from "@/components/interview/interview-results";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PracticeSessionReportPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const { data, isLoading, error } = trpc.practice.getSessionReport.useQuery({
    sessionId: params.sessionId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my-sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Sessions
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Practice feedback not found.</p>
      </div>
    );
  }

  return (
    <InterviewResults
      interviewId={data.interviewId}
      initialSessionId={params.sessionId}
      onBack={() => router.push("/my-sessions")}
    />
  );
}
