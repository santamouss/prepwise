import { createLogger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCalendarMonthBillingPeriod } from "@/lib/practice/usage/billing-period";
import { PRACTICE_SESSION_COMPLETED_EVENT } from "@/lib/practice/usage/constants";
import { isCountablePracticeSession } from "@/lib/practice/usage/is-countable";

const log = createLogger("practice/usage");

export type RecordPracticeUsageResult =
  | { recorded: true }
  | { recorded: false; reason: string };

export async function recordPracticeUsageIfCountable(
  sessionId: string,
): Promise<RecordPracticeUsageResult> {
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select(
      `
      id,
      status,
      totalDurationSeconds,
      participantMetadata,
      interview:interviews!inner(id, userId, isPractice)
    `,
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { recorded: false, reason: "session_not_found" };
  }

  const interviewRaw = session.interview as
    | { id: string; userId: string; isPractice: boolean }
    | { id: string; userId: string; isPractice: boolean }[];
  const interview = Array.isArray(interviewRaw) ? interviewRaw[0] : interviewRaw;

  if (!interview?.isPractice) {
    return { recorded: false, reason: "not_practice_interview" };
  }

  const userId = interview.userId;

  const { count: userMessageCount, error: messagesError } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sessionId", sessionId)
    .eq("role", "USER");

  if (messagesError) {
    log.error("Failed to count user messages for usage", {
      sessionId,
      error: messagesError.message,
    });
    return { recorded: false, reason: "message_count_failed" };
  }

  const countable = isCountablePracticeSession({
    status: session.status,
    isPracticeInterview: interview.isPractice,
    totalDurationSeconds: session.totalDurationSeconds,
    userMessageCount: userMessageCount ?? 0,
  });

  if (!countable) {
    log.info("Practice session not countable for usage", {
      sessionId,
      userId,
      duration: session.totalDurationSeconds,
      userMessageCount,
    });
    return { recorded: false, reason: "not_countable" };
  }

  const period = getCalendarMonthBillingPeriod();
  const metadata = {
    durationSeconds: session.totalDurationSeconds,
    userMessageCount: userMessageCount ?? 0,
    interviewId: interview.id,
  };

  const { error: insertError } = await supabaseAdmin.from("usage_events").insert({
    user_id: userId,
    session_id: sessionId,
    event_type: PRACTICE_SESSION_COMPLETED_EVENT,
    billing_period_start: period.startIso,
    billing_period_end: period.endIso,
    quantity: 1,
    metadata,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      log.info("Practice usage event already recorded (idempotent)", {
        sessionId,
        userId,
      });
      return { recorded: false, reason: "already_recorded" };
    }
    log.error("Failed to insert practice usage event", {
      sessionId,
      userId,
      error: insertError.message,
    });
    return { recorded: false, reason: "insert_failed" };
  }

  log.info("Recorded practice usage event", { sessionId, userId });
  return { recorded: true };
}
