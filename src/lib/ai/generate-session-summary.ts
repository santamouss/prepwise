import { svgDataUrlToPng } from "@/lib/ai/convert-svg";
import { extractJson } from "@/lib/ai/extract-json";
import { buildSummaryPrompt } from "@/lib/ai/prompts/summary";
import { getProvider, REPORT_MODEL } from "@/lib/ai/registry";
import { createLogger } from "@/lib/logger";
import {
  normalizeQuestionEvaluationsForSession,
  type QuestionEvaluationRecord,
  type SessionReachContext,
} from "@/lib/session/question-evaluation";
import { hasSessionFeedback } from "@/lib/session/session-has-feedback";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SessionDeliveryInsights } from "@/lib/voice/delivery-analysis";

const log = createLogger("ai/generate-session-summary");

export type GenerateSessionSummaryParams = {
  sessionId: string;
  interviewTitle: string;
  objective?: string | null;
  language?: string | null;
  questions?: { text: string; order: number; type?: string }[] | null;
  assessmentCriteria?: { name: string; description: string }[] | null;
};

export async function generateSessionSummary(
  params: GenerateSessionSummaryParams,
): Promise<void> {
  const {
    sessionId,
    interviewTitle,
    objective,
    language,
    questions,
    assessmentCriteria,
  } = params;

  try {
    const { data: sessionMeta } = await supabaseAdmin
      .from("sessions")
      .select(
        `summary, themes, insights, currentQuestionId, totalDurationSeconds,
        interview:interviews!inner(
          timeLimitMinutes,
          questions(id, text, order, type)
        )`,
      )
      .eq("id", sessionId)
      .order("order", {
        referencedTable: "interviews.questions",
        ascending: true,
      })
      .single();

    if (sessionMeta && hasSessionFeedback(sessionMeta)) {
      log.info(`Summary skipped for session ${sessionId}: feedback already present`);
      return;
    }

    const { data: allMessages } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("sessionId", sessionId)
      .order("timestamp", { ascending: true });

    if (!allMessages || allMessages.length === 0) {
      log.info(`No messages to summarize for session ${sessionId}`);
      return;
    }

    const whiteboardDrawingsRaw = allMessages
      .filter((m) => m.contentType === "WHITEBOARD" && m.whiteboardData)
      .map((m) => {
        const data = m.whiteboardData as Record<string, unknown>;
        return {
          label: (data.label as string) || "Untitled Drawing",
          imageDataUrl: m.whiteboardImageUrl ?? null,
        };
      });

    const whiteboardDrawings = await Promise.all(
      whiteboardDrawingsRaw.map(async (d) => ({
        ...d,
        imageDataUrl: d.imageDataUrl
          ? await svgDataUrlToPng(d.imageDataUrl)
          : null,
      })),
    );

    const codeSnippetsInput = allMessages
      .filter((m) => (m.contentType as string) === "CODE" && m.whiteboardData)
      .map((m) => {
        const data = m.whiteboardData as Record<string, unknown>;
        return {
          label: (data.label as string) || "Untitled Snippet",
          code: (data.code as string) || "",
          language: (data.language as string) || "plaintext",
        };
      })
      .filter((s) => s.code.trim().length > 0);

    const provider = getProvider(REPORT_MODEL);
    const textMessages = allMessages
      .filter((m) => m.contentType === "TEXT")
      .map((m) => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }));
    const drawingsInput =
      whiteboardDrawings.length > 0 ? whiteboardDrawings : null;
    const codeInput = codeSnippetsInput.length > 0 ? codeSnippetsInput : null;

    const priorInsights = sessionMeta?.insights as {
      deliveryMetrics?: SessionDeliveryInsights;
      sessionProgress?: { lastQuestionIndex?: number | null };
    } | null;
    const deliveryMetrics = priorInsights?.deliveryMetrics ?? null;

    const interviewRaw = sessionMeta?.interview;
    const interviewMeta = (
      Array.isArray(interviewRaw) ? interviewRaw[0] : interviewRaw
    ) as {
      timeLimitMinutes: number | null;
      questions: { id: string; text: string; order: number; type?: string }[];
    } | null;

    const reachContext: SessionReachContext | null = interviewMeta?.questions
      ?.length
      ? {
          questions: interviewMeta.questions.map((q) => ({
            id: q.id,
            text: q.text,
            order: q.order,
          })),
          currentQuestionId: sessionMeta?.currentQuestionId ?? null,
          totalDurationSeconds: sessionMeta?.totalDurationSeconds ?? null,
          timeLimitMinutes: interviewMeta.timeLimitMinutes ?? null,
          messages: allMessages
            .filter((m) => m.contentType === "TEXT")
            .map((m) => ({
              role: m.role === "USER" ? "user" : "assistant",
              content: m.content,
              questionId: m.questionId as string | null | undefined,
            })),
          lastQuestionIndex:
            priorInsights?.sessionProgress?.lastQuestionIndex ?? null,
        }
      : null;

    const promptMessages = buildSummaryPrompt(
      interviewTitle,
      textMessages,
      objective,
      assessmentCriteria,
      questions,
      language,
      drawingsInput,
      codeInput,
      deliveryMetrics,
    );

    let response;
    try {
      response = await provider.generateResponse({
        messages: promptMessages,
        temperature: 0.3,
        maxTokens: 8192,
        model: REPORT_MODEL,
      });
    } catch (err) {
      const isVisionError =
        err instanceof Error &&
        /image.*not supported|vision.*not supported|does not support.*image/i.test(
          err.message,
        );
      if (isVisionError && drawingsInput?.some((d) => d.imageDataUrl)) {
        log.info("Model does not support images, retrying text-only");
        const textOnlyDrawings = drawingsInput.map((d) => ({
          ...d,
          imageDataUrl: null,
        }));
        const fallbackMessages = buildSummaryPrompt(
          interviewTitle,
          textMessages,
          objective,
          assessmentCriteria,
          questions,
          language,
          textOnlyDrawings,
          codeInput,
          deliveryMetrics,
        );
        response = await provider.generateResponse({
          messages: fallbackMessages,
          temperature: 0.3,
          maxTokens: 8192,
          model: REPORT_MODEL,
        });
      } else {
        throw err;
      }
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = extractJson(response.content);
    } catch (parseErr) {
      log.error(
        "Raw AI response (first 1000 chars):",
        response.content.slice(0, 1000),
      );
      throw parseErr;
    }

    const insightsData: Record<string, unknown> = {
      keyInsights: parsed.keyInsights ?? [],
    };
    if (deliveryMetrics) {
      insightsData.deliveryMetrics = deliveryMetrics;
    }
    if (parsed.criteriaEvaluations) {
      insightsData.criteriaEvaluations = parsed.criteriaEvaluations;
    }
    if (parsed.questionEvaluations) {
      const rawEvaluations = parsed.questionEvaluations as QuestionEvaluationRecord[];
      insightsData.questionEvaluations =
        reachContext != null
          ? normalizeQuestionEvaluationsForSession(rawEvaluations, reachContext)
          : rawEvaluations;
    }
    if (parsed.researchFindings) {
      insightsData.researchFindings = parsed.researchFindings;
    }
    if (parsed.toneAnalysis) {
      insightsData.toneAnalysis = parsed.toneAnalysis;
    }

    await supabaseAdmin
      .from("sessions")
      .update({
        summary: String(parsed.summary ?? ""),
        themes: (parsed.themes as string[]) ?? [],
        sentiment: parsed.sentiment ?? null,
        insights: insightsData,
      })
      .eq("id", sessionId);

    const themeCount = Array.isArray(parsed.themes) ? parsed.themes.length : 0;
    const insightCount = Array.isArray(parsed.keyInsights)
      ? parsed.keyInsights.length
      : 0;
    const qEvalCount = Array.isArray(parsed.questionEvaluations)
      ? parsed.questionEvaluations.length
      : 0;
    log.info(
      `Summary generated for session ${sessionId}: ` +
        `${themeCount} themes, ${insightCount} insights, ${qEvalCount} question evaluations`,
    );
  } catch (error) {
    log.error("Summary generation failed:", error);
    throw error;
  }
}

export async function triggerSessionSummaryIfNeeded(sessionId: string): Promise<void> {
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select(
      `summary, themes, insights,
      interview:interviews!inner(
        title, objective, language, assessmentCriteria,
        questions(text, order, type)
      )`,
    )
    .eq("id", sessionId)
    .single();

  if (!session || hasSessionFeedback(session)) {
    return;
  }

  const interviewRaw = session.interview;
  const interview = (Array.isArray(interviewRaw) ? interviewRaw[0] : interviewRaw) as {
    title: string;
    objective: string | null;
    language: string;
    assessmentCriteria: { name: string; description: string }[] | null;
    questions: { text: string; order: number; type?: string }[];
  };

  await generateSessionSummary({
    sessionId,
    interviewTitle: interview.title,
    objective: interview.objective,
    language: interview.language,
    questions: interview.questions,
    assessmentCriteria: interview.assessmentCriteria,
  });
}
