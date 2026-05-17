"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { PracticeDuration, PracticeInterviewType } from "@/lib/practice/constants";
import {
  formatPracticeRemaining,
  formatPracticeUsageSummary,
} from "@/lib/practice/format-usage";
import {
  jobPostingFetchErrorMessage,
  validateJobPostingExtractedText,
} from "@/lib/practice/validate-job-posting-text";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Loader2,
  Mic,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

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

type JobUrlFetchStatus = "idle" | "loading" | "success" | "error";

export default function PracticePage() {
  const router = useRouter();
  const { toast } = useToast();
  const startPractice = trpc.practice.start.useMutation();
  const { data: monthlyUsage } = trpc.practice.getMonthlyUsage.useQuery();

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState("");
  const [jobUrlFetchStatus, setJobUrlFetchStatus] = useState<JobUrlFetchStatus>("idle");
  const [jobUrlFetchMessage, setJobUrlFetchMessage] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [interviewType, setInterviewType] = useState<PracticeInterviewType>("BEHAVIORAL");
  const [durationMinutes, setDurationMinutes] = useState<PracticeDuration>(10);

  const resumeFileRef = useRef<HTMLInputElement>(null);
  const isStarting = startPractice.isPending;
  const isFetchingJobUrl = jobUrlFetchStatus === "loading";
  const atMonthlyLimit =
    monthlyUsage != null &&
    !monthlyUsage.isUnlimited &&
    monthlyUsage.remaining === 0;
  const remainingLabel = monthlyUsage
    ? formatPracticeRemaining(monthlyUsage)
    : null;

  const extractText = useCallback(async (source: { file?: File; url?: string }) => {
    const formData = new FormData();
    if (source.file) formData.append("file", source.file);
    if (source.url) formData.append("url", source.url);
    const res = await fetch("/api/ai/extract-text", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Extraction failed");
    return data.text as string;
  }, []);

  const handleFetchJobUrl = useCallback(async () => {
    const url = jobDescriptionUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setJobUrlFetchStatus("error");
      setJobUrlFetchMessage("Enter a valid URL starting with http:// or https://");
      return;
    }

    setJobUrlFetchStatus("loading");
    setJobUrlFetchMessage("Fetching job post…");
    try {
      const text = await extractText({ url });
      const validation = validateJobPostingExtractedText(text);
      if (!validation.ok) {
        setJobUrlFetchStatus("error");
        setJobUrlFetchMessage(jobPostingFetchErrorMessage(url));
        return;
      }

      setJobDescription(text);
      const charCount = text.trim().length;
      setJobUrlFetchStatus("success");
      setJobUrlFetchMessage(
        `Job post loaded. Loaded ${charCount.toLocaleString()} characters from job post.`,
      );
    } catch {
      setJobUrlFetchStatus("error");
      setJobUrlFetchMessage(jobPostingFetchErrorMessage(url));
    }
  }, [jobDescriptionUrl, extractText]);

  const handleResumeFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setResumeLoading(true);
      setResumeError("");
      try {
        const text = await extractText({ file });
        setResumeText(text);
        setResumeFileName(file.name);
      } catch (err) {
        setResumeError(err instanceof Error ? err.message : "Failed to extract resume text");
        setResumeText("");
        setResumeFileName("");
      } finally {
        setResumeLoading(false);
        if (resumeFileRef.current) resumeFileRef.current.value = "";
      }
    },
    [extractText],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStarting) return;

    if (!role.trim()) {
      toast({
        title: "Role title needed",
        description:
          jobDescription.trim()
            ? "Enter a role title to start practice. Your pasted job description will still be used."
            : "Enter a role title, or add a job description under optional context.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await startPractice.mutateAsync({
        role: role.trim(),
        company: company.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
        jobDescriptionUrl: jobDescriptionUrl.trim() || undefined,
        resumeText: resumeText.trim() || undefined,
        resumeFileName: resumeFileName || undefined,
        interviewType,
        durationMinutes,
      });

      if (result.warnings?.length) {
        for (const message of result.warnings) {
          toast({
            title: "Note about your job posting link",
            description: message,
          });
        }
      }

      router.push(result.redirectUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not start practice. Please try again.";
      toast({
        title: "Could not start voice practice",
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
          Set up a voice mock interview and practice speaking with Parker
        </p>
        {monthlyUsage && (
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatPracticeUsageSummary(monthlyUsage)}
          </p>
        )}
        {remainingLabel && (
          <p
            className={cn(
              "mt-1 text-sm",
              atMonthlyLimit ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {remainingLabel}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Interview setup</CardTitle>
          <CardDescription>
            Parker will tailor spoken questions to your role, job posting, and resume when you
            provide them. You may be asked for microphone access when the session starts.
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
              {!showContext ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-[#3B6FF0] hover:underline"
                  onClick={() => setShowContext(true)}
                  disabled={isStarting}
                >
                  Add job description or resume (optional)
                  <ChevronDown className="h-4 w-4" />
                </button>
              ) : (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Job context & resume
                    </p>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowContext(false)}
                      disabled={isStarting}
                    >
                      Hide
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescriptionUrl">Job posting URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="jobDescriptionUrl"
                        type="url"
                        value={jobDescriptionUrl}
                        onChange={(e) => {
                          setJobDescriptionUrl(e.target.value);
                          if (!isFetchingJobUrl) {
                            setJobUrlFetchStatus("idle");
                            setJobUrlFetchMessage("");
                          }
                        }}
                        placeholder="https://company.com/careers/role"
                        disabled={isStarting || isFetchingJobUrl}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={
                          isStarting || isFetchingJobUrl || !jobDescriptionUrl.trim()
                        }
                        onClick={() => void handleFetchJobUrl()}
                        aria-label="Fetch job posting"
                      >
                        {isFetchingJobUrl ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {jobUrlFetchStatus !== "idle" && jobUrlFetchMessage && (
                      <p
                        role="status"
                        className={cn(
                          "text-xs",
                          jobUrlFetchStatus === "loading" &&
                            "flex items-center gap-1.5 text-muted-foreground",
                          jobUrlFetchStatus === "success" && "text-green-700 dark:text-green-400",
                          jobUrlFetchStatus === "error" && "text-amber-600 dark:text-amber-500",
                        )}
                      >
                        {jobUrlFetchStatus === "loading" && (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        )}
                        {jobUrlFetchMessage}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Fetch loads the posting into the field below. A failed link won&apos;t block
                      you if you enter a role or paste the description.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Pasted job description</Label>
                    <Textarea
                      id="jobDescription"
                      rows={4}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here for tailored questions..."
                      disabled={isStarting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Resume (PDF, optional)</Label>
                    <input
                      ref={resumeFileRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleResumeFile}
                      disabled={isStarting || resumeLoading}
                    />
                    {resumeLoading && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting resume…
                      </p>
                    )}
                    {resumeText && !resumeLoading && (
                      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-[#3B6FF0]" />
                        <span className="min-w-0 flex-1 truncate">{resumeFileName}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setResumeText("");
                            setResumeFileName("");
                            setResumeError("");
                          }}
                          disabled={isStarting}
                          aria-label="Remove resume"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!resumeText && !resumeLoading && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isStarting}
                        onClick={() => resumeFileRef.current?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Upload resume (PDF)
                      </Button>
                    )}
                    {resumeError && (
                      <p className="text-xs text-destructive">{resumeError}</p>
                    )}
                  </div>
                </div>
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

            <div className="flex items-start gap-3 rounded-lg border border-[#3B6FF0]/20 bg-[#EEF2FF] px-4 py-3 text-sm text-[#1e3a8a]">
              <Mic className="mt-0.5 h-5 w-5 shrink-0 text-[#3B6FF0]" />
              <p>
                Voice practice only — you&apos;ll speak with Parker out loud. Microphone permission
                may be requested before your session begins.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#3B6FF0] hover:bg-[#3B6FF0]/90"
              disabled={isStarting || !role.trim() || atMonthlyLimit}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parker is preparing your voice interview…
                </>
              ) : (
                <>Start Voice Practice →</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
