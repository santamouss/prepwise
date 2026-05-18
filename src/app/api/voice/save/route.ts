import { generateSessionSummary } from "@/lib/ai/generate-session-summary";
import { createLogger } from "@/lib/logger";
import { recordPracticeUsageIfCountable } from "@/lib/practice/usage/record-usage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  mergeDeliveryIntoSessionInsights,
  type DeliveryAnswerRecord,
} from "@/lib/voice/delivery-analysis";
import { NextResponse } from "next/server";
import { handleVoiceSave, type CompletionSession, type ProgressSession, type VoiceSaveOps, type VoiceSavePayload } from "./logic";

const log = createLogger("api/voice/save");
const voiceSaveOps: VoiceSaveOps = {
  async insertMessages(sessionId, messages, currentQuestionIndex) {
    const deliveryAnswers: DeliveryAnswerRecord[] = [];

    await supabaseAdmin.from("messages").insert(
      messages.map((m) => {
        if (m.role === "user" && m.delivery) {
          deliveryAnswers.push({
            ...m.delivery,
            questionIndex:
              typeof m.delivery.questionIndex === "number"
                ? m.delivery.questionIndex
                : currentQuestionIndex,
          });
        }
        return {
          sessionId,
          role: m.role === "user" ? ("USER" as const) : ("ASSISTANT" as const),
          content: m.content,
          contentType: "TEXT" as const,
          questionId: m.questionId || null,
          wordCount: m.delivery?.wordCount ?? m.content.split(/\s+/).length,
          readingTimeSeconds: m.delivery?.estimatedDurationSeconds ?? null,
          transcription: m.source === "chat" ? "chat" : null,
        };
      }),
    );

    if (deliveryAnswers.length > 0) {
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("insights")
        .eq("id", sessionId)
        .single();

      const insights = mergeDeliveryIntoSessionInsights(
        (session?.insights as Record<string, unknown> | null) ?? null,
        deliveryAnswers,
      );

      await supabaseAdmin.from("sessions").update({ insights }).eq("id", sessionId);
    }
  },
  async loadSessionForCompletion(sessionId) {
    const { data } = await supabaseAdmin
      .from("sessions")
      .select(
        `*, interview:interviews!inner(title, objective, language, userId, projectId, assessmentCriteria, questions(text, order, type))`,
      )
      .eq("id", sessionId)
      .order("order", {
        referencedTable: "interviews.questions",
        ascending: true,
      })
      .single();

    return (data as CompletionSession | null) ?? null;
  },
  async loadFirstMessageTimestamp(sessionId) {
    const { data } = await supabaseAdmin
      .from("messages")
      .select("timestamp")
      .eq("sessionId", sessionId)
      .order("timestamp", { ascending: true })
      .limit(1)
      .single();

    return (data?.timestamp as string | undefined) ?? null;
  },
  async loadSessionForProgress(sessionId) {
    const { data } = await supabaseAdmin
      .from("sessions")
      .select(`*, interview:interviews!inner(questions(*))`)
      .eq("id", sessionId)
      .order("order", {
        referencedTable: "interviews.questions",
        ascending: true,
      })
      .single();

    return (data as ProgressSession | null) ?? null;
  },
  async updateSession(sessionId, payload) {
    await supabaseAdmin.from("sessions").update(payload).eq("id", sessionId);
  },
  generateSummary(sessionId, interviewTitle, objective, language, questions, assessmentCriteria) {
    return generateSessionSummary({
      sessionId,
      interviewTitle,
      objective,
      language,
      questions,
      assessmentCriteria,
    });
  },
  log,
  now: () => new Date(),
};

/**
 * POST /api/voice/save
 * Save voice interview messages, optionally complete the session,
 * and fire-and-forget an AI summary/analysis so the interviewee isn't blocked.
 */
export async function POST(req: Request) {
  const payload = (await req.json()) as VoiceSavePayload;
  const result = await handleVoiceSave(payload, voiceSaveOps);

  if (result.status === 200 && payload.complete && payload.sessionId) {
    void recordPracticeUsageIfCountable(payload.sessionId).catch((err) => {
      log.error("Practice usage recording after voice save failed:", err);
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
