import { generateSessionSummary } from "@/lib/ai/generate-session-summary";
import { createLogger } from "@/lib/logger";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const log = createLogger("api/ai/summarize");

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await req.json();

  try {
    const { data: interviewSession } = await supabaseAdmin
      .from("sessions")
      .select(
        `*, interview:interviews!inner(title, userId, objective, language, assessmentCriteria, questions(text, order, type))`,
      )
      .eq("id", sessionId)
      .order("order", { referencedTable: "interviews.questions", ascending: true })
      .single();

    if (
      !interviewSession ||
      (interviewSession.interview as { userId: string }).userId !== user.id
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const interview = interviewSession.interview as {
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

    const { data: updated } = await supabaseAdmin
      .from("sessions")
      .select("summary, themes, sentiment, insights")
      .eq("id", sessionId)
      .single();

    return NextResponse.json(updated ?? { ok: true });
  } catch (error) {
    log.error("Summary generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
