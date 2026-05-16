"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { PracticeDuration, PracticeInterviewType } from "@/lib/practice/constants";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Mic,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const INTERVIEW_TYPES: {
  value: PracticeInterviewType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "BEHAVIORAL", label: "Behavioral", icon: Users },
  { value: "ROLE_SPECIFIC", label: "Role-Specific", icon: Briefcase },
  { value: "TECHNICAL", label: "Technical", icon: Wrench },
  { value: "SALES", label: "Sales", icon: Zap },
  { value: "LEADERSHIP", label: "Leadership", icon: Users },
];

const DURATIONS: {
  value: PracticeDuration;
  label: string;
  questions: number;
}[] = [
  { value: 5, label: "5 min", questions: 3 },
  { value: 10, label: "10 min", questions: 5 },
  { value: 15, label: "15 min", questions: 7 },
];

export default function PracticePage() {
  const router = useRouter();
  const { toast } = useToast();
  const startPractice = trpc.practice.start.useMutation();

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [interviewType, setInterviewType] = useState<PracticeInterviewType>("BEHAVIORAL");
  const [durationMinutes, setDurationMinutes] = useState<PracticeDuration>(10);
  const [mode, setMode] = useState<"voice" | "chat">("voice");

  const isStarting = startPractice.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || isStarting) return;

    try {
      const result = await startPractice.mutateAsync({
        role: role.trim(),
        company: company.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
        interviewType,
        durationMinutes,
        mode,
      });
      router.push(result.redirectUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start practice. Please try again.";
      toast({
        title: "Could not start practice",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Practice Interview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your mock interview and start practicing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Interview setup</CardTitle>
          <CardDescription>
            Parker will tailor questions to your role and interview type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role">
                Role / Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Product Manager, Software Engineer, BDR"
                disabled={isStarting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company or Industry</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google, SaaS startup, Healthcare"
                disabled={isStarting}
              />
            </div>

            <div className="space-y-2">
              {!showJobDescription ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-[#3B6FF0] hover:underline"
                  onClick={() => setShowJobDescription(true)}
                  disabled={isStarting}
                >
                  Add job description (optional)
                  <ChevronDown className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowJobDescription(false)}
                      disabled={isStarting}
                    >
                      Hide
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                  <Textarea
                    id="jobDescription"
                    rows={5}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here for tailored questions..."
                    disabled={isStarting}
                  />
                </>
              )}
            </div>

            <div className="space-y-3">
              <Label>Interview Type</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INTERVIEW_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = interviewType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      disabled={isStarting}
                      onClick={() => setInterviewType(type.value)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-[#3B6FF0] bg-[#EEF2FF] text-[#1e3a8a]"
                          : "border-border hover:border-[#3B6FF0]/40",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => {
                  const selected = durationMinutes === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      disabled={isStarting}
                      onClick={() => setDurationMinutes(d.value)}
                      className={cn(
                        "rounded-lg border p-3 text-center transition-colors",
                        selected
                          ? "border-[#3B6FF0] bg-[#EEF2FF]"
                          : "border-border hover:border-[#3B6FF0]/40",
                      )}
                    >
                      <p className="text-sm font-semibold">{d.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.questions} questions
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={() => setMode("voice")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                    mode === "voice"
                      ? "border-[#3B6FF0] bg-[#EEF2FF]"
                      : "border-border hover:border-[#3B6FF0]/40",
                  )}
                >
                  <Mic className="h-6 w-6 text-[#3B6FF0]" />
                  <span className="text-sm font-medium">Voice</span>
                  <span className="text-xs text-muted-foreground">Speech conversation</span>
                </button>
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={() => setMode("chat")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                    mode === "chat"
                      ? "border-[#3B6FF0] bg-[#EEF2FF]"
                      : "border-border hover:border-[#3B6FF0]/40",
                  )}
                >
                  <MessageSquare className="h-6 w-6 text-[#3B6FF0]" />
                  <span className="text-sm font-medium">Chat</span>
                  <span className="text-xs text-muted-foreground">Text messaging</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#3B6FF0] hover:bg-[#3B6FF0]/90"
              disabled={isStarting || !role.trim()}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parker is preparing your interview...
                </>
              ) : (
                <>Start Practice →</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
