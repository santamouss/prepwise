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
const POLL_INTERVAL_MS = 1500;

type Phase = "processing" | "feedback-pending" | "thank-you";

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
  const ranRef = useRef(false);

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
    if (authLoading || ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    const maybeTriggerRecruiterSummary = async () => {
      if (
        isPractice ||
        plan.thankYouOnly ||
        !user ||
        profile?.user_type !== "recruiter"
      ) {
        return;
      }
      try {
        await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // Background summary may already be running from voice save.
      }
    };

    (async () => {
      const startedAt = Date.now();
      let saveOk = saveSucceeded;

      try {
        if (!saveOk) {
          await completeSession.mutateAsync({ id: sessionId });
          saveOk = true;
        }
      } catch {
        // Session may already be completed via voice save.
      }

      await maybeTriggerRecruiterSummary();

      if (plan.thankYouOnly) {
        while (!cancelled && Date.now() - startedAt < MAX_FEEDBACK_WAIT_MS) {
          try {
            const session = await utils.session.getById.fetch({ id: sessionId });
            if (session.status === "COMPLETED") saveOk = true;
          } catch {
            // Keep polling until timeout.
          }
          if (saveOk && Date.now() - startedAt >= MIN_DISPLAY_MS) break;
          await sleep(POLL_INTERVAL_MS);
        }
        if (cancelled) return;
        const elapsedInvite = Date.now() - startedAt;
        if (elapsedInvite < MIN_DISPLAY_MS) {
          await sleep(MIN_DISPLAY_MS - elapsedInvite);
        }
        if (cancelled) return;
        setPhase("thank-you");
        return;
      }

      let feedbackReady = false;

      while (!cancelled && Date.now() - startedAt < MAX_FEEDBACK_WAIT_MS) {
        try {
          const session = await utils.session.getById.fetch({ id: sessionId });
          if (session.status === "COMPLETED") saveOk = true;
          if (hasSessionFeedback(session)) feedbackReady = true;
        } catch {
          // Keep polling until timeout.
        }

        const elapsed = Date.now() - startedAt;
        if (
          saveOk &&
          feedbackReady &&
          elapsed >= MIN_DISPLAY_MS
        ) {
          break;
        }

        if (saveOk && elapsed >= MIN_DISPLAY_MS && feedbackReady) {
          break;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DISPLAY_MS) {
        await sleep(MIN_DISPLAY_MS - elapsed);
      }

      if (cancelled) return;

      if (!saveOk) {
        setPhase("feedback-pending");
        return;
      }

      if (!feedbackReady) {
        setPhase("feedback-pending");
        return;
      }

      if (plan.thankYouOnly) {
        setPhase("thank-you");
        return;
      }

      if (plan.redirectPath) {
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
    completeSession,
    interviewId,
    isPractice,
    isPreview,
    isInviteFlow,
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
            <h2 className="mt-4 text-2xl font-bold">Thank you!</h2>
            {completionReason === "TIME_LIMIT_EXCEEDED" && (
              <p className="mt-2 text-sm text-amber-600">
                The session time limit has been reached and the interview was
                ended automatically.
              </p>
            )}
            <p className="mt-2 text-muted-foreground">
              Your interview has been completed successfully. We appreciate your
              time and thoughtful responses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "feedback-pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-secondary-500" />
            <h2 className="mt-4 text-xl font-semibold">Interview saved</h2>
            <p className="mt-3 text-muted-foreground">
              Interview saved, but feedback is still processing. You can find it
              in{" "}
              {profile?.user_type === "recruiter" ? "your session results" : "My Sessions"}
              .
            </p>
            <Button asChild className="mt-6">
              <Link href={plan.sessionsListPath}>
                {profile?.user_type === "recruiter"
                  ? "View session results"
                  : "Go to My Sessions"}
              </Link>
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
