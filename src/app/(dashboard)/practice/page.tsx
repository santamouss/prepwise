"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Practice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run AI-powered mock interviews tailored to your goals.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#3B6FF0]">
            <Mic className="h-6 w-6" />
          </div>
          <CardTitle>Start practicing</CardTitle>
          <CardDescription>
            Choose a role and interview type to begin a practice session. Your
            sessions will appear under My Sessions when you finish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-[#3B6FF0] hover:bg-[#3B6FF0]/90" disabled>
            Start practice interview (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
