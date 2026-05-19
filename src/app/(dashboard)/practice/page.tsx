"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
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
  DEFAULT_CANDIDATE_PRACTICE_MODE,
  type PracticeMode,
} from "@/lib/practice/practice-mode";
import {
  buildPracticeLoginUrl,
  clearPendingPracticeForm,
  loadPendingPracticeForm,
  savePendingPracticeForm,
  type PendingPracticeForm,
} from "@/lib/practice/pending-practice-form";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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

const PRACTICE_STYLES: {
  value: PracticeMode;
  label: string;
  helper: string;
  badge?: string;
}[] = [
  {
    value: "coach",
    label: "Coach Mode",
    helper: "Get coaching after each answer and retry before moving on.",
    badge: "Recommended",
  },
  {
    value: "mock",
    label: "Mock Interview",
    helper: "Simulate the real interview and get feedback at the end.",
  },
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

function applyPendingToForm(
  pending: PendingPracticeForm,
  setters: {
    setRole: (v: string) => void;
    setCompany: (v: string) => void;
    setJobDescription: (v: string) => void;
    setJobDescriptionUrl: (v: string) => void;
    setResumeText: (v: string) => void;
    setResumeFileName: (v: string) => void;
    setInterviewType: (v: PracticeInterviewType) => void;
    setDurationMinutes: (v: PracticeDuration) => void;
    setPracticeMode: (v: PracticeMode) => void;
    setShowContext: (v: boolean) => void;
  },
) {
  setters.setRole(pending.role);
  setters.setCompany(pending.company ?? "");
  setters.setJobDescription(pending.jobDescription ?? "");
  setters.setJobDescriptionUrl(pending.jobDescriptionUrl ?? "");
  setters.setResumeText(pending.resumeText ?? "");
  setters.setResumeFileName(pending.resumeFileName ?? "");
  setters.setInterviewType(pending.interviewType);
  setters.setDurationMinutes(pending.durationMinutes);
  setters.setPracticeMode(pending.practiceMode);
  setters.setShowContext(
    Boolean(
      pending.company?.trim() ||
        pending.jobDescription?.trim() ||
        pending.jobDescriptionUrl?.trim() ||
        pending.resumeText?.trim(),
    ),
  );
}

function PracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const startPractice = trpc.practice.start.useMutation();
  const { data: monthlyUsage } = trpc.practice.getMonthlyUsage.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const autoStartRequested = searchParams.get("autoStart") === "true";
  const autoStartAttemptedRef = useRef(false);

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
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    DEFAULT_CANDIDATE_PRACTICE_MODE,
  );

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

  const buildFormPayload = useCallback((): PendingPracticeForm | null => {
    const trimmedRole = role.trim();
    if (!trimmedRole) return null;
    return {
      role: trimmedRole,
      company: company.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      jobDescriptionUrl: jobDescriptionUrl.trim() || undefined,
      resumeText: resumeText.trim() || undefined,
      resumeFileName: resumeFileName || undefined,
      interviewType,
      durationMinutes,
      practiceMode,
    };
  }, [
    role,
    company,
    jobDescription,
    jobDescriptionUrl,
    resumeText,
    resumeFileName,
    interviewType,
    durationMinutes,
    practiceMode,
  ]);

  const startPracticeSession = useCallback(
    async (payload: PendingPracticeForm) => {
      const result = await startPractice.mutateAsync({
        role: payload.role,
        company: payload.company,
        jobDescription: payload.jobDescription,
        jobDescriptionUrl: payload.jobDescriptionUrl,
        resumeText: payload.resumeText,
        resumeFileName: payload.resumeFileName,
        interviewType: payload.interviewType,
        durationMinutes: payload.durationMinutes,
        practiceMode: payload.practiceMode,
      });

      clearPendingPracticeForm();

      if (result.warnings?.length) {
        for (const message of result.warnings) {
          toast({
            title: "Note about your job posting link",
            description: message,
          });
        }
      }

      router.push(result.redirectUrl);
    },
    [router, startPractice, toast],
  );

  useEffect(() => {
    if (authLoading || !autoStartRequested || !user || autoStartAttemptedRef.current) {
      return;
    }

    const pending = loadPendingPracticeForm();
    if (!pending) return;

    autoStartAttemptedRef.current = true;
    applyPendingToForm(pending, {
      setRole,
      setCompany,
      setJobDescription,
      setJobDescriptionUrl,
      setResumeText,
      setResumeFileName,
      setInterviewType,
      setDurationMinutes,
      setPracticeMode,
      setShowContext,
    });

    void startPracticeSession(pending).catch((error) => {
      autoStartAttemptedRef.current = false;
      const message =
        error instanceof Error ? error.message : "Could not start practice. Please try again.";
      toast({
        title: "Could not start voice practice",
        description: message,
        variant: "destructive",
      });
    });
  }, [authLoading, autoStartRequested, user, startPracticeSession, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStarting || authLoading) return;

    const payload = buildFormPayload();
    if (!payload) {
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

    if (!user) {
      savePendingPracticeForm(payload);
      router.push(buildPracticeLoginUrl());
      return;
    }

    try {
      await startPracticeSession(payload);
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
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-10 px-4 sm:px-0 pb-8">
      <div className="ph-page-header">
        <h1 className="text-xl sm:text-2xl">Practice with Parker</h1>
        <p className="text-sm sm:text-base">
          A calm voice session tailored to your target role. Add optional context when you want
          sharper questions.
        </p>
        {monthlyUsage && (
          <p className="mt-3 text-xs sm:text-sm font-medium text-foreground">
            {formatPracticeUsageSummary(monthlyUsage)}
          </p>
        )}
        {remainingLabel && (
          <p
            className={cn(
              "mt-1 text-xs sm:text-sm",
              atMonthlyLimit ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {remainingLabel}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="ph-surface space-y-3 p-4 sm:p-6">
          <Label htmlFor="role" className="text-sm sm:text-base font-medium">
            What role are you interviewing for?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Manager, Software Engineer, BDR"
            disabled={isStarting}
            className="h-10 sm:h-12 border-border/80 text-sm sm:text-base shadow-sm"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Parker uses this as the anchor for your questions and coaching.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs sm:text-sm font-medium text-foreground">How do you want to practice?</Label>
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
            {PRACTICE_STYLES.map((style) => {
              const selected = practiceMode === style.value;
              return (
                <button
                  key={style.value}
                  type="button"
                  disabled={isStarting}
                  onClick={() => setPracticeMode(style.value)}
                  className={cn("ph-option-card", selected && "ph-option-card-selected")}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold">{style.label}</span>
                    {style.badge && <span className="ph-option-badge text-xs">{style.badge}</span>}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {style.helper}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <div className="space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-foreground">Interview type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      "ph-option-card items-center gap-2 p-2 sm:p-3",
                      selected && "ph-option-card-selected",
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-foreground">Session length</Label>
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
                      "ph-option-card items-center p-2 sm:p-3 text-center",
                      selected && "ph-option-card-selected",
                    )}
                  >
                    <p className="text-xs sm:text-sm font-semibold">{d.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{d.questions} questions</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!showContext ? (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary transition-colors hover:text-primary/80"
              onClick={() => setShowContext(true)}
              disabled={isStarting}
            >
              Add company, job description, or resume (optional)
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : (
            <div className="ph-surface space-y-3 sm:space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-medium text-foreground">Optional context</p>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowContext(false)}
                  disabled={isStarting}
                >
                  Hide
                  <ChevronUp className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs sm:text-sm">Company or industry</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google, SaaS startup, Healthcare"
                  disabled={isStarting}
                  className="border-border/80 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescriptionUrl" className="text-xs sm:text-sm">Job posting URL</Label>
                <div className="flex gap-2 flex-col sm:flex-row">
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
                    className="border-border/80 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 sm:w-auto w-full h-10"
                    disabled={isStarting || isFetchingJobUrl || !jobDescriptionUrl.trim()}
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
                  Fetch loads the posting into the field below. A failed link won&apos;t block you
                  if you enter a role or paste the description.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-xs sm:text-sm">Pasted job description</Label>
                <Textarea
                  id="jobDescription"
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here for tailored questions..."
                  disabled={isStarting}
                  className="border-border/80 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Resume (PDF, optional)</Label>
                <input
                  ref={resumeFileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleResumeFile}
                  disabled={isStarting || resumeLoading}
                />
                {resumeLoading && (
                  <p className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting resume…
                  </p>
                )}
                {resumeText && !resumeLoading && (
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs sm:text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{resumeFileName}</span>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground shrink-0"
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
                    className="w-full border-border/80 h-10"
                    disabled={isStarting}
                    onClick={() => resumeFileRef.current?.click()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Upload resume (PDF)
                  </Button>
                )}
                {resumeError && <p className="text-xs text-destructive">{resumeError}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-accent/40 px-3 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-foreground">
          <Mic className="mt-0.5 h-4 sm:h-5 w-4 sm:w-5 shrink-0 text-primary" />
          <p className="leading-relaxed text-muted-foreground">
            Voice practice only — you&apos;ll speak with Parker out loud. Microphone permission may
            be requested before your session begins.
          </p>
        </div>

        <Button
          type="submit"
          className="ph-primary-cta w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
          disabled={isStarting || authLoading || !role.trim() || atMonthlyLimit}
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Parker is preparing your voice interview…</span>
              <span className="sm:hidden">Preparing…</span>
            </>
          ) : (
            <>Start voice practice</>
          )}
        </Button>
      </form>
    </div>
  );
}

function PracticePageFallback() {
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticePageFallback />}>
      <PracticePageContent />
    </Suspense>
  );
}
