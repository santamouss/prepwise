"use client";

import { useAuth } from "@/components/auth-provider";
import { ParkerLogo } from "@/components/ui/parker-logo";
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
  Plus,
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

  const isLoggedIn = Boolean(user);
  const isGuestSetup = !isLoggedIn && !authLoading;

  return (
    <div
      className={cn(
        "relative w-full min-h-screen",
        isGuestSetup
          ? "practice-guest-setup"
          : "bg-gradient-to-b from-background to-muted/20 lg:min-h-0",
      )}
    >
      {isGuestSetup && <div className="practice-guest-setup-glow" aria-hidden />}
      <div className="relative mx-auto max-w-[800px] px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-16 lg:pt-14">
        <header className="mb-8 hidden text-center lg:block">
          <ParkerLogo height={52} className="mx-auto object-center" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
            Practice with Parker
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-base leading-relaxed text-muted-foreground">
            Run realistic voice interviews, get direct coaching after each answer, and receive a
            full report when you finish.
          </p>
          {isLoggedIn && monthlyUsage && (
            <div className="mx-auto mt-4 inline-flex flex-col items-center rounded-lg border border-border/70 bg-muted/30 px-4 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                {formatPracticeUsageSummary(monthlyUsage)}
              </p>
              {remainingLabel && (
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    atMonthlyLimit ? "font-medium text-amber-600" : "text-muted-foreground",
                  )}
                >
                  {remainingLabel}
                </p>
              )}
            </div>
          )}
        </header>

        <div className="mb-6 sm:mb-8 lg:hidden">
          <p className="mb-2 text-xs font-medium text-primary sm:text-sm">
            <span className="mr-2 inline-block">🎤</span>Candidate Practice
          </p>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Practice with Parker
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Run realistic voice mock interviews, get instant feedback, and improve your interview
            skills before the real thing.
          </p>
        </div>

        <div
          className={cn(
            "rounded-xl border border-border p-6 shadow-sm sm:p-8",
            isGuestSetup ? "bg-card/95 shadow-md backdrop-blur-[2px]" : "bg-card",
          )}
        >
              {/* Mobile: show benefits as collapse-friendly summary */}
              <div className="lg:hidden mb-6 pb-6 border-b">
                {monthlyUsage && (
                  <div className="bg-accent/40 rounded-lg p-4 mb-4">
                    <p className="text-xs font-medium text-foreground">
                      {formatPracticeUsageSummary(monthlyUsage)}
                    </p>
                    {remainingLabel && (
                      <p className={cn(
                        "text-xs mt-1",
                        atMonthlyLimit ? "text-amber-600 font-medium" : "text-muted-foreground",
                      )}>
                        {remainingLabel}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="role" className="text-sm font-semibold flex items-center gap-1">
                    What role are you interviewing for?
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Product Manager, Software Engineer, BDR"
                    disabled={isStarting}
                    className="h-11 border-border/80 text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Parker will tailor questions to this role.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">How do you want to practice?</Label>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {PRACTICE_STYLES.map((style) => {
                      const selected = practiceMode === style.value;
                      return (
                        <button
                          key={style.value}
                          type="button"
                          disabled={isStarting}
                          onClick={() => setPracticeMode(style.value)}
                          className={cn(
                            "relative rounded-lg border-2 p-4 text-left transition-all",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border/50 bg-muted/30 hover:border-border"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-foreground">{style.label}</span>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {style.helper}
                              </p>
                            </div>
                            {style.badge && (
                              <span className="ml-2 flex-shrink-0 inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                                {style.badge}
                              </span>
                            )}
                          </div>
                          {selected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 border-t pt-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Interview type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INTERVIEW_TYPES.map((type) => {
                        const Icon = type.icon;
                        const selected = interviewType === type.value;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            disabled={isStarting}
                            className={cn(
                              "rounded-lg border-2 p-3 text-center transition-all flex flex-col items-center gap-2",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border/50 bg-muted/20 hover:border-border"
                            )}
                            onClick={() => setInterviewType(type.value)}
                          >
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Session length</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {DURATIONS.map((d) => {
                        const selected = durationMinutes === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            disabled={isStarting}
                            className={cn(
                              "rounded-lg border-2 p-3 text-center transition-all",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border/50 bg-muted/20 hover:border-border"
                            )}
                            onClick={() => setDurationMinutes(d.value)}
                          >
                            <p className="text-sm font-semibold">{d.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{d.questions}Q</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-6">
                  {!showContext ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      onClick={() => setShowContext(true)}
                      disabled={isStarting}
                    >
                      <Plus className="h-4 w-4" />
                      Add job description or resume (optional)
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Optional context</p>
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
                        <Label htmlFor="company">Company or industry</Label>
                        <Input
                          id="company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. Google, SaaS startup, Healthcare"
                          disabled={isStarting}
                          className="h-10"
                        />
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
                            className="h-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 h-10 w-10 p-0"
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
                          Fetch loads the posting below. A failed link won't block you.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobDescription">Pasted job description</Label>
                        <Textarea
                          id="jobDescription"
                          rows={3}
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder="Paste the job description here..."
                          disabled={isStarting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Resume (PDF)</Label>
                        <input
                          ref={resumeFileRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={handleResumeFile}
                          disabled={isStarting || resumeLoading}
                        />
                        {resumeLoading && (
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting…
                          </p>
                        )}
                        {resumeText && !resumeLoading && (
                          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate text-xs">{resumeFileName}</span>
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
                            className="w-full h-10"
                            disabled={isStarting}
                            onClick={() => resumeFileRef.current?.click()}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Upload resume
                          </Button>
                        )}
                        {resumeError && <p className="text-xs text-destructive">{resumeError}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  <Mic className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You'll speak with Parker out loud. Microphone permission will be requested when your session starts.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isStarting || authLoading || !role.trim() || atMonthlyLimit}
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing your session…
                    </>
                  ) : (
                    <>Start voice practice</>
                  )}
                </Button>
              </form>
        </div>
      </div>
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
