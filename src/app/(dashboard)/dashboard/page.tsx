"use client";

import { useAuth } from "@/components/auth-provider";
import { CandidateDashboard } from "@/components/dashboard/candidate-dashboard";
import { RecruiterDashboard } from "@/components/dashboard/recruiter-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (profile?.user_type === "candidate") {
    return <CandidateDashboard />;
  }

  return <RecruiterDashboard />;
}
