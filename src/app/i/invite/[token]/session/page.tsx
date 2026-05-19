"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AntiCheatingGuard } from "@/components/session/anti-cheating-banner";
import { IntervieweeOnboarding } from "@/components/session/interviewee-onboarding";
import { PreparingScreen } from "@/components/session/preparing-screen";
import { SessionCompletionScreen } from "@/components/session/session-completion-screen";
import { isPracticeInterview } from "@/lib/practice/is-practice-interview";
import type { SessionCompletionPayload } from "@/lib/session/session-completion-types";
import { safeReplace } from "@/lib/navigation/safe-router";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ChatInterface = dynamic(
  () => import("@/components/session/chat-interface").then((m) => m.ChatInterface),
  { ssr: false, loading: () => <PreparingScreen /> },
);
const VoiceInterface = dynamic(
  () => import("@/components/session/voice-interface").then((m) => m.VoiceInterface),
  { ssr: false, loading: () => <PreparingScreen /> },
);

export default function InviteSessionPage() {
  const params = useParams();
  const token = params.token as string;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteExitRedirectedRef = useRef(false);

  const [completed, setCompleted] = useState(false);
  const [completionPayload, setCompletionPayload] =
    useState<SessionCompletionPayload | null>(null);
  const [completionReason, setCompletionReason] = useState<string | undefined>();
  const [onboardingDone, setOnboardingDone] = useState(false);

  const handleComplete = (payload: SessionCompletionPayload) => {
    setCompletionPayload(payload);
    setCompletionReason(payload.reason);
    setCompleted(true);
  };

  const candidate = trpc.candidate.getByToken.useQuery(
    { token },
    { retry: false },
  );

  useEffect(() => {
    if (inviteExitRedirectedRef.current) return;

    const target = `/i/invite/${token}`;
    const shouldRedirect =
      candidate.isError ||
      (candidate.data && !(candidate.data as { session?: unknown }).session);

    if (!shouldRedirect) return;

    safeReplace(router, pathname, searchParams, target);
    inviteExitRedirectedRef.current = true;
  }, [candidate.data, candidate.isError, pathname, router, searchParams, token]);

  if (candidate.isLoading || !candidate.data) {
    return <PreparingScreen />;
  }

  const session = (candidate.data as any).session;
  const interview = (candidate.data as any).interview;

  if (!session) {
    return <PreparingScreen />;
  }

  if (completed || session.status === "COMPLETED") {
    return (
      <SessionCompletionScreen
        sessionId={session.id}
        interviewId={interview.id}
        isPractice={isPracticeInterview(interview)}
        isPreview={false}
        isInviteFlow
        completionReason={completionReason}
        saveSucceeded={
          completionPayload?.saveSucceeded ?? session.status === "COMPLETED"
        }
      />
    );
  }

  if (!onboardingDone) {
    return (
      <IntervieweeOnboarding
        interviewTitle={interview.title}
        interviewDescription={interview.description}
        questionCount={interview.questions?.length ?? 0}
        timeLimitMinutes={interview.timeLimitMinutes}
        language={interview.language}
        antiCheatingEnabled={!!interview.antiCheatingEnabled}
        isPractice={isPracticeInterview(interview)}
        voiceEnabled={!!interview.voiceEnabled}
        chatEnabled={!!interview.chatEnabled}
        aiName={interview.aiName}
        questionTypes={(interview.questions ?? []).map((q: any) => q.type as string)}
        onComplete={() => setOnboardingDone(true)}
      />
    );
  }

  const useVoice = interview.voiceEnabled;

  if (useVoice) {
    const interviewContext = {
      title: interview.title,
      objective: interview.objective,
      aiName: interview.aiName,
      aiTone: interview.aiTone,
      language: interview.language,
      followUpDepth: interview.followUpDepth,
      questions: interview.questions.map((q: any) => ({
        text: q.text,
        type: q.type,
        description: q.description,
        options: q.options,
        starterCode: q.starterCode as { language: string; code: string } | null,
        order: q.order,
      })),
    };

    return (
      <>
        <AntiCheatingGuard enabled={!!interview.antiCheatingEnabled} sessionId={session.id} />
        <VoiceInterface
          sessionId={session.id}
          interviewId={interview.id}
          interviewTitle={interview.title}
          aiName={interview.aiName}
          questionCount={interview.questions.length}
          interviewContext={interviewContext}
          durationMinutes={interview.timeLimitMinutes ?? undefined}
          chatEnabled={!!interview.chatEnabled}
          autoStartMicrophone={isPracticeInterview(interview)}
          onComplete={handleComplete}
          videoMode={!!interview.videoEnabled}
        />
      </>
    );
  }

  return (
    <>
      <AntiCheatingGuard enabled={!!interview.antiCheatingEnabled} sessionId={session.id} />
      <ChatInterface
        sessionId={session.id}
        interview={{
          ...interview,
          questions: interview.questions.map((q: any) => ({
            ...q,
            starterCode: q.starterCode as { language: string; code: string } | null,
          })),
        }}
        durationMinutes={interview.timeLimitMinutes ?? undefined}
        onComplete={handleComplete}
      />
    </>
  );
}
