"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AntiCheatingGuard } from "@/components/session/anti-cheating-banner";
import { IntervieweeOnboarding, PreviewWrapper } from "@/components/session/interviewee-onboarding";
import { IntervieweeTourOverlay } from "@/components/session/interviewee-tour-overlay";
import { IntervieweeTourProvider } from "@/components/session/interviewee-tour-provider";
import { PreparingScreen } from "@/components/session/preparing-screen";
import { SessionCompletionScreen } from "@/components/session/session-completion-screen";
import type { InterviewContext } from "@/hooks/use-voice";
import { isPracticeInterview } from "@/lib/practice/is-practice-interview";
import { getPracticeInterviewType, getPracticeMode } from "@/lib/practice/practice-mode";
import { shouldSkipCandidatePracticeOnboarding } from "@/lib/session/skip-practice-onboarding";
import { isIntervieweeSessionTourEnabled } from "@/lib/tour/tour-flags";
import type { SessionCompletionPayload } from "@/lib/session/session-completion-types";
import { safeReplace } from "@/lib/navigation/safe-router";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_PREFIX = "parker_session_";

const ChatInterface = dynamic(
  () => import("@/components/session/chat-interface").then((m) => m.ChatInterface),
  { ssr: false, loading: () => <PreparingScreen /> },
);
const VoiceInterface = dynamic(
  () => import("@/components/session/voice-interface").then((m) => m.VoiceInterface),
  { ssr: false, loading: () => <PreparingScreen /> },
);

export default function SlugSessionPage() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionExitRedirectedRef = useRef(false);
  const slug = params.slug as string;
  const sidParam = searchParams.get("sid");
  const isPreview = searchParams.get("preview") === "true";

  const [completed, setCompleted] = useState(false);
  const [completionPayload, setCompletionPayload] =
    useState<SessionCompletionPayload | null>(null);
  const [completionReason, setCompletionReason] = useState<string | undefined>();
  const [onboardingDone, setOnboardingDone] = useState(isPreview);
  const [previewTourDone, setPreviewTourDone] = useState(false);

  const handleComplete = (payload: SessionCompletionPayload) => {
    setCompletionPayload(payload);
    setCompletionReason(payload.reason);
    setCompleted(true);
  };

  const handleTourReady = useCallback(() => {
    setPreviewTourDone(true);
  }, []);

  const sessionId = useMemo(() => {
    if (sidParam) return sidParam;
    try { return localStorage.getItem(STORAGE_PREFIX + slug); } catch { return null; }
  }, [sidParam, slug]);

  const interview = trpc.interview.getBySlug.useQuery({ slug }, { retry: false });
  const session = trpc.session.getById.useQuery(
    { id: sessionId! },
    { enabled: !!sessionId, retry: false },
  );

  useEffect(() => {
    if (sessionExitRedirectedRef.current) return;
    if (!sessionId || session.isError) {
      safeReplace(router, pathname, searchParams, `/i/${slug}`);
      sessionExitRedirectedRef.current = true;
    }
  }, [sessionId, session.isError, slug, pathname, router, searchParams]);


  const interviewData = interview.data;
  const skipPracticeOnboarding =
    !!interviewData &&
    shouldSkipCandidatePracticeOnboarding(interviewData, { isPreview });

  if (interview.isLoading || session.isLoading || !interviewData || !session.data) {
    return (
      <PreparingScreen
        title={
          skipPracticeOnboarding
            ? "Starting your practice interview..."
            : undefined
        }
      />
    );
  }

  const antiCheatingEnabled = !isPreview && !!interviewData.antiCheatingEnabled;
  const isPractice = isPracticeInterview(interviewData);

  if (session.data.status === "COMPLETED" || completed) {
    try { localStorage.removeItem(STORAGE_PREFIX + slug); } catch { /* noop */ }
    return (
      <SessionCompletionScreen
        sessionId={sessionId!}
        interviewId={interviewData.id}
        isPractice={isPractice}
        isPreview={isPreview}
        isInviteFlow={false}
        completionReason={completionReason}
        saveSucceeded={
          completionPayload?.saveSucceeded ?? session.data.status === "COMPLETED"
        }
      />
    );
  }

  if (!skipPracticeOnboarding && !onboardingDone) {
    return (
      <IntervieweeOnboarding
        interviewTitle={interviewData.title}
        interviewDescription={interviewData.description}
        questionCount={interviewData.questions.length}
        timeLimitMinutes={interviewData.timeLimitMinutes}
        language={interviewData.language}
        antiCheatingEnabled={antiCheatingEnabled}
        isPractice={isPractice}
        voiceEnabled={!!interviewData.voiceEnabled}
        chatEnabled={!!interviewData.chatEnabled}
        aiName={interviewData.aiName}
        questionTypes={interviewData.questions.map((q: any) => q.type as string)}
        onComplete={() => setOnboardingDone(true)}
      />
    );
  }

  // Derive resume state
  const resumeMessages = session.data.messages;
  const resumeQuestionIndex = (() => {
    const { currentQuestionId } = session.data;
    if (currentQuestionId) {
      const idx = interviewData.questions.findIndex((q: any) => q.id === currentQuestionId);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const isResuming = resumeMessages && resumeMessages.length > 0;

  const resumeTextMessages = resumeMessages
    ?.filter((m: any) => m.contentType === "TEXT")
    .map((m: any) => ({ id: m.id, role: m.role, content: m.content }));

  const resumeDrawings = resumeMessages
    ?.filter((m: any) => m.contentType === "WHITEBOARD" && m.whiteboardData)
    .map((m: any) => ({
      id: m.content,
      label: (m.whiteboardData as Record<string, unknown>)?.label as string ?? "Drawing",
      snapshotData: JSON.stringify(m.whiteboardData),
    }));

  const useVoice = interviewData.voiceEnabled;

  const showPreviewTour =
    isPreview && !previewTourDone && isIntervieweeSessionTourEnabled();

  if (showPreviewTour) {
    const mode = useVoice ? "voice" : "chat";
    const mockContext: InterviewContext = {
      title: interviewData.title,
      aiName: interviewData.aiName ?? "AI Interviewer",
      aiTone: "professional",
      language: interviewData.language ?? "en-US",
      followUpDepth: "medium",
      questions: interviewData.questions.map((q: any, i: number) => ({
        text: q.text,
        type: q.type as string,
        order: i,
      })),
    };

    return (
      <IntervieweeTourProvider mode={mode}>
        <PreviewWrapper onReady={handleTourReady}>
          {mode === "voice" ? (
            <VoiceInterface
              sessionId="__preview__"
              interviewId="__preview__"
              interviewTitle={interviewData.title}
              aiName={interviewData.aiName ?? "AI Interviewer"}
              questionCount={interviewData.questions.length}
              interviewContext={mockContext}
              durationMinutes={interviewData.timeLimitMinutes ?? undefined}
              chatEnabled={!!interviewData.chatEnabled}
              onComplete={() => {}}
              preview
            />
          ) : (
            <ChatInterface
              sessionId="__preview__"
              interview={{
                id: "__preview__",
                title: interviewData.title,
                aiName: interviewData.aiName ?? "AI Interviewer",
                mode: "CHAT",
                questions: mockContext.questions.map((q, i) => ({
                  id: `preview-q-${i}`,
                  text: q.text,
                  type: q.type,
                })),
              }}
              durationMinutes={interviewData.timeLimitMinutes ?? undefined}
              onComplete={() => {}}
              preview
            />
          )}
        </PreviewWrapper>
        <IntervieweeTourOverlay />
      </IntervieweeTourProvider>
    );
  }

  if (useVoice) {
    const practiceMode = isPractice ? getPracticeMode(interviewData) : undefined;
    const practiceInterviewType = isPractice
      ? getPracticeInterviewType(interviewData)
      : undefined;
    const interviewContext = {
      title: interviewData.title,
      objective: interviewData.objective,
      aiName: interviewData.aiName,
      aiTone: interviewData.aiTone,
      language: interviewData.language,
      followUpDepth: interviewData.followUpDepth,
      ...(isPractice && practiceMode
        ? {
            practiceMode,
            isPractice: true,
            ...(practiceInterviewType ? { practiceInterviewType } : {}),
          }
        : isPractice
          ? { isPractice: true }
          : {}),
      startQuestionIndex: isResuming ? resumeQuestionIndex : undefined,
      questions: interviewData.questions.map((q: any) => ({
        id: q.id,
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
        <AntiCheatingGuard enabled={antiCheatingEnabled} sessionId={sessionId!} />
        <VoiceInterface
          sessionId={sessionId!}
          interviewId={interviewData.id}
          interviewTitle={interviewData.title}
          aiName={interviewData.aiName}
          questionCount={interviewData.questions.length}
          interviewContext={interviewContext}
          durationMinutes={interviewData.timeLimitMinutes ?? undefined}
          initialMessages={isResuming ? resumeTextMessages : undefined}
          initialDrawings={isResuming && resumeDrawings?.length ? resumeDrawings : undefined}
          chatEnabled={!!interviewData.chatEnabled}
          autoStartMicrophone={isPractice && !isPreview}
          onComplete={handleComplete}
          videoMode={isPreview ? false : !!interviewData.videoEnabled}
        />
      </>
    );
  }

  return (
    <>
      <AntiCheatingGuard enabled={antiCheatingEnabled} sessionId={sessionId!} />
      <ChatInterface
        sessionId={sessionId!}
        interview={{
          ...interviewData,
          questions: interviewData.questions.map((q: any) => ({
            ...q,
            starterCode: q.starterCode as { language: string; code: string } | null,
          })),
        }}
        durationMinutes={interviewData.timeLimitMinutes ?? undefined}
        initialMessages={resumeMessages
          ?.filter((m: any) => m.contentType !== "WHITEBOARD")
          .map((m: any) => ({
            id: m.id,
            role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
            content: m.content,
            timestamp: m.timestamp.toString(),
          }))}
        initialQuestionIndex={isResuming ? resumeQuestionIndex : undefined}
        onComplete={handleComplete}
      />
    </>
  );
}
