"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasSessionFeedback } from "@/lib/session/session-has-feedback";
import { resolvePostInterviewRedirect } from "@/lib/session/post-interview-redirect";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const MIN_DISPLAY_MS = 2500;
const MAX_FEEDBACK_WAIT_MS = 60_000;
const INVITE_SAVE_WAIT_MS = 12_000;
const POLL_INTERVAL_MS = 1500;
const AUTH_WAIT_MS = 4000;

type Phase = "processing" | "feedback-pending" | "thank-you";

function completionLog(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info("[session-completion]", message, detail);
  } else {
    console.info("[session-completion]", message);
  }
}

export type SessionCompletionScreenProps = {
  sessionId: string;
  interviewId: string;
  isPractice: boolean;
  isPreview: boolean;
  isInviteFlow: boolean;
  completionReason?: string;
  saveSucceeded?: boolean;
};

export function SessionCompletionScreen({
  sessionId,
  interviewId,
  isPractice,
  isPreview,
  isInviteFlow,
  completionReason,
  saveSucceeded = true,
}: SessionCompletionScreenProps) {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const completeSession = trpc.session.complete.useMutation();

  const [phase, setPhase] = useState<Phase>("processing");
  const startedForSessionRef = useRef<string | null>(null);
  const authWaitStartedRef = useRef(Date.now());
  const [authTimedOut, setAuthTimedOut] = useState(false);

  const plan = useMemo(
    () =>
      resolvePostInterviewRedirect({
        sessionId,
        interviewId,
        isPractice,
        isPreview,
        isInviteFlow,
        isAuthenticated: !!user,
        userType: profile?.user_type ?? null,
      }),
    [
      sessionId,
      interviewId,
      isPractice,
      isPreview,
      isInviteFlow,
      user,
      profile?.user_type,
    ],
  );

  useEffect(() => {
    if (authLoading && !authTimedOut) {
      if (Date.now() - authWaitStartedRef.current > AUTH_WAIT_MS) {
        completionLog("auth wait timed out; proceeding without profile");
        setAuthTimedOut(true);
      }
      return;
    }
  }, [authLoading, authTimedOut]);

  useEffect(() => {
    const authReady = !authLoading || authTimedOut;
    if (!authReady) return;
    if (startedForSessionRef.current === sessionId) return;
    startedForSessionRef.current = sessionId;

    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    const ensureMinDisplay = async (startedAt: number) => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DISPLAY_MS) {
        await sleep(MIN_DISPLAY_MS - elapsed);
      }
    };

    const pollSession = async () => {
      const session = await utils.session.getById.fetch(
        { id: sessionId },
        { staleTime: 0 },
      );
      return session;
    };

    const maybeTriggerOwnerSummarize = async () => {
      if (plan.thankYouOnly || !user || profile?.user_type !== "recruiter") {
        return;
      }
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        completionLog("recruiter summarize trigger", {
          sessionId,
          ok: res.ok,
          status: res.status,
        });
      } catch (err) {
        completionLog("recruiter summarize trigger failed", {
          sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    (async () => {
      const startedAt = Date.now();
      let saveOk = saveSucceeded;

      try {
        if (!saveOk) {
          await completeSession.mutateAsync({ id: sessionId });
          saveOk = true;
          completionLog("session.complete succeeded", { sessionId });
        } else {
          completionLog("session already saved before completion screen", {
            sessionId,
          });
        }
      } catch (err) {
        completionLog("session.complete failed or skipped", {
          sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
        try {
          const session = await pollSession();
          if (session.status === "COMPLETED") saveOk = true;
        } catch {
          // handled by timeout fallback
        }
      }

      if (plan.thankYouOnly) {
        const inviteDeadline = startedAt + INVITE_SAVE_WAIT_MS;
        while (!cancelled && Date.now() < inviteDeadline) {
          try {
            const session = await pollSession();
            if (session.status === "COMPLETED") saveOk = true;
          } catch (pollErr) {
            completionLog("invite save poll error", {
              sessionId,
              error: pollErr instanceof Error ? pollErr.message : String(pollErr),
            });
          }
          if (saveOk && Date.now() - startedAt >= MIN_DISPLAY_MS) break;
          await sleep(POLL_INTERVAL_MS);
        }

        if (cancelled) return;
        await ensureMinDisplay(startedAt);
        if (cancelled) return;

        completionLog("showing thank-you (public participant)", { sessionId, saveOk });
        setPhase("thank-you");
        return;
      }

      await maybeTriggerOwnerSummarize();

      let feedbackReady = false;
      const feedbackDeadline = startedAt + MAX_FEEDBACK_WAIT_MS;

      while (!cancelled && Date.now() < feedbackDeadline) {
        try {
          const session = await pollSession();
          if (session.status === "COMPLETED") saveOk = true;
          if (hasSessionFeedback(session)) {
            feedbackReady = true;
            completionLog("feedback ready", { sessionId });
          }
        } catch (pollErr) {
          completionLog("feedback poll error", {
            sessionId,
            error: pollErr instanceof Error ? pollErr.message : String(pollErr),
          });
        }

        const elapsed = Date.now() - startedAt;
        if (saveOk && feedbackReady && elapsed >= MIN_DISPLAY_MS) {
          break;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      if (cancelled) return;

      await ensureMinDisplay(startedAt);
      if (cancelled) return;

      if (!saveOk) {
        completionLog("save not confirmed; showing fallback", { sessionId });
        setPhase("feedback-pending");
        return;
      }

      if (!feedbackReady) {
        completionLog("feedback polling timed out; showing fallback", {
          sessionId,
          waitedMs: Date.now() - startedAt,
        });
        setPhase("feedback-pending");
        return;
      }

      if (plan.redirectPath) {
        completionLog("redirecting after feedback ready", {
          sessionId,
          path: plan.redirectPath,
        });
        router.push(plan.redirectPath);
        return;
      }

      setPhase("thank-you");
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    authTimedOut,
    completeSession,
    interviewId,
    isPractice,
    isPreview,
    isInviteFlow,
    plan.fallbackPath,
    plan.redirectPath,
    plan.thankYouOnly,
    profile?.user_type,
    router,
    saveSucceeded,
    sessionId,
    user,
    utils.session.getById,
  ]);

  if (phase === "thank-you") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-secondary-500" />
            <h2 className="mt-4 text-2xl font-bold">Interview complete</h2>
            {completionReason === "TIME_LIMIT_EXCEEDED" && (
              <p className="mt-2 text-sm text-amber-600">
                The session time limit has been reached and the interview was
                ended automatically.
              </p>
            )}
            <p className="mt-2 text-muted-foreground">
              Thank you — your responses have been submitted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "feedback-pending") {
    const fallbackMessage = plan.isRecruiter
      ? "Interview saved. Results are still processing."
      : "Interview saved. Your feedback is still processing.";
    const fallbackButtonLabel = plan.isRecruiter
      ? "View results"
      : plan.isCandidatePractice
        ? "View session"
        : "View My Sessions";

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-secondary-500" />
            <h2 className="mt-4 text-xl font-semibold">Interview saved</h2>
            <p className="mt-3 text-muted-foreground">{fallbackMessage}</p>
            <Button asChild className="mt-6">
              <Link href={plan.fallbackPath}>{fallbackButtonLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Interview complete</h2>
          <p className="mt-3 text-muted-foreground">
            Parker is generating your feedback…
          </p>
          {completionReason === "TIME_LIMIT_EXCEEDED" && (
            <p className="mt-2 text-sm text-amber-600">
              The session time limit has been reached.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
