"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import Link from "next/link";

export default function MySessionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My Sessions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your past practice interviews and feedback.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No sessions yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Complete a practice interview and your session history will show up
            here.
          </p>
          <Button asChild className="mt-6 bg-[#3B6FF0] hover:bg-[#3B6FF0]/90">
            <Link href="/practice">Start practicing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
