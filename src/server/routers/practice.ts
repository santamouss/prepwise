import { generateInterviewFromDescription } from "@/lib/ai/generate-interview-sync";
import type { GeneratedQuestion } from "@/lib/ai/types";
import { nanoid } from "@/lib/id";
import {
  buildPracticeGeneratorDescription,
  practiceFollowUpDepth,
  practiceQuestionCount,
  type PracticeDuration,
  type PracticeInterviewType,
} from "@/lib/practice/constants";
import { resolvePracticeJobDescription } from "@/lib/practice/job-description-context";
import { getSessionOverallScore, type SessionScoreInsights } from "@/lib/session-score";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

const startInput = z.object({
  role: z.string().min(1),
  company: z.string().optional(),
  jobDescription: z.string().optional(),
  jobDescriptionUrl: z.string().optional(),
  resumeText: z.string().optional(),
  resumeFileName: z.string().optional(),
  interviewType: z.enum([
    "BEHAVIORAL",
    "ROLE_SPECIFIC",
    "TECHNICAL",
    "SALES",
    "LEADERSHIP",
  ]),
  durationMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});

type PracticeSessionRow = {
  id: string;
  status: string;
  modeUsed: string | null;
  createdAt: string;
  totalDurationSeconds: number | null;
  themes: string[] | null;
  insights: SessionScoreInsights;
  interview: {
    id: string;
    title: string;
    timeLimitMinutes: number | null;
    chatEnabled: boolean;
    voiceEnabled: boolean;
  };
};

async function assertCandidateProfile(supabase: Context["supabase"], userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, email, name")
    .eq("id", userId)
    .single();

  if (profile?.user_type !== "candidate") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Practice features are only available for candidate accounts.",
    });
  }

  if (!profile.email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Your profile must have an email address to start practice.",
    });
  }

  return profile as { user_type: "candidate"; email: string; name: string | null };
}

async function resolveDefaultProjectId(
  supabase: Context["supabase"],
  userId: string,
): Promise<string> {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("workspaceId")
    .eq("userId", userId)
    .limit(1)
    .single();

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No organization found",
    });
  }

  const { data: defaultProject } = await supabase
    .from("projects")
    .select("id")
    .eq("organizationId", membership.workspaceId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .single();

  if (!defaultProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No project found.",
    });
  }

  return defaultProject.id;
}

function mapSessionRow(session: PracticeSessionRow) {
  const score = getSessionOverallScore(session.insights);
  const durationSeconds = session.totalDurationSeconds ?? 0;
  const plannedMinutes = session.interview.timeLimitMinutes;

  return {
    id: session.id,
    interviewId: session.interview.id,
    title: session.interview.title,
    date: session.createdAt,
    durationSeconds,
    plannedMinutes,
    score,
    status: session.status,
    modeUsed: session.modeUsed,
    themes: session.themes ?? [],
  };
}

async function fetchMyPracticeSessions(
  supabase: Context["supabase"],
  userId: string,
  email: string,
): Promise<PracticeSessionRow[]> {
  const { data: myInterviews, error: interviewsError } = await supabase
    .from("interviews")
    .select("id")
    .eq("userId", userId);

  if (interviewsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: interviewsError.message,
    });
  }

  const interviewIds = (myInterviews ?? []).map((row) => row.id);
  if (interviewIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      status,
      modeUsed,
      createdAt,
      totalDurationSeconds,
      themes,
      insights,
      interview:interviews(
        id,
        title,
        timeLimitMinutes,
        chatEnabled,
        voiceEnabled
      )
    `,
    )
    .in("interviewId", interviewIds)
    .eq("participantEmail", email)
    .order("createdAt", { ascending: false });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  return (data ?? []) as unknown as PracticeSessionRow[];
}

function collectImprovementAreas(
  sessions: PracticeSessionRow[],
  limit: number,
): string[] {
  const areas: string[] = [];
  for (const session of sessions) {
    if (session.status !== "COMPLETED") continue;
    const insights = session.insights as {
      questionEvaluations?: { improvements?: string[] }[];
    } | null;
    const evaluations = insights?.questionEvaluations ?? [];
    for (const evaluation of evaluations) {
      for (const item of evaluation.improvements ?? []) {
        const trimmed = item.trim();
        if (trimmed && !areas.includes(trimmed)) {
          areas.push(trimmed);
          if (areas.length >= limit) return areas;
        }
      }
    }
  }
  return areas;
}

function collectTopThemes(sessions: PracticeSessionRow[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== "COMPLETED") continue;
    for (const theme of session.themes ?? []) {
      const key = theme.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme]) => theme);
}

export const practiceRouter = router({
  start: protectedProcedure.input(startInput).mutation(async ({ ctx, input }) => {
    const profile = await assertCandidateProfile(ctx.supabase, ctx.user.id);
    const projectId = await resolveDefaultProjectId(ctx.supabase, ctx.user.id);

    const duration = input.durationMinutes as PracticeDuration;
    const questionCount = practiceQuestionCount(duration);
    const followUpDepth = practiceFollowUpDepth(duration);
    const interviewType = input.interviewType as PracticeInterviewType;

    const { combined: jobDescriptionForAi, urlFetchFailed } =
      await resolvePracticeJobDescription({
        pastedJobDescription: input.jobDescription,
        jobDescriptionUrl: input.jobDescriptionUrl?.trim() || undefined,
      });

    const resumeText = input.resumeText?.trim() || undefined;

    const generatorDescription = buildPracticeGeneratorDescription({
      role: input.role,
      company: input.company,
      interviewType,
      duration,
    });

    const generated = await generateInterviewFromDescription(generatorDescription, {
      durationMinutes: duration,
      language: "en",
      jobDescription: jobDescriptionForAi,
      resumeText,
    });

    const roleTitle = input.role.trim();
    const title = `${roleTitle} Interview`;
    const typeLabel = interviewType.replace("_", "-").toLowerCase();
    const description = `Practice mock interview for ${roleTitle} (${typeLabel} focus). Parker will guide you through tailored questions.`;
    const objective = [
      `Role: ${roleTitle}.`,
      input.company?.trim() ? `Company/industry: ${input.company.trim()}.` : "",
      `Interview type: ${typeLabel}.`,
      jobDescriptionForAi ? `\n\nJob description:\n${jobDescriptionForAi}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const questionsToInsert = (generated.questions ?? []).slice(0, questionCount);

    if (questionsToInsert.length === 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AI did not return any questions. Please try again.",
      });
    }

    const { data: interview, error: interviewError } = await ctx.supabase
      .from("interviews")
      .insert({
        projectId,
        userId: ctx.user.id,
        title,
        description,
        objective: objective || generated.objective,
        assessmentCriteria: generated.assessmentCriteria ?? [],
        chatEnabled: true,
        voiceEnabled: true,
        videoEnabled: false,
        antiCheatingEnabled: false,
        isPractice: true,
        customBranding: { isPractice: true, source: "practice" },
        requireInvite: false,
        aiName: "Parker",
        aiTone: "FRIENDLY",
        followUpDepth,
        language: "en",
        timeLimitMinutes: duration,
        isActive: false,
      })
      .select("id")
      .single();

    if (interviewError || !interview) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: interviewError?.message ?? "Failed to create practice interview",
      });
    }

    const questionRows = questionsToInsert.map((q: GeneratedQuestion, index: number) => ({
      interviewId: interview.id,
      order: index,
      text: q.text,
      description: q.description ?? null,
      type: q.type,
      options: q.options ?? null,
      starterCode: q.type === "CODING" && q.starterCode ? q.starterCode : null,
      followUpPrompts: q.followUpPrompts ?? null,
      timeLimitSeconds: q.timeLimitSeconds ?? null,
      isRequired: q.isRequired ?? true,
      probeOnShort: true,
      allowFileUpload: false,
      allowedFileTypes: [],
    }));

    const { error: questionsError } = await ctx.supabase
      .from("questions")
      .insert(questionRows);

    if (questionsError) {
      await ctx.supabase.from("interviews").delete().eq("id", interview.id);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: questionsError.message,
      });
    }

    const { data: insertedQuestions, error: fetchQuestionsError } = await ctx.supabase
      .from("questions")
      .select("id")
      .eq("interviewId", interview.id)
      .order("order", { ascending: true });

    if (fetchQuestionsError) {
      await ctx.supabase.from("interviews").delete().eq("id", interview.id);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: fetchQuestionsError.message,
      });
    }

    const slug = nanoid(10);
    const { error: publishError } = await ctx.supabase
      .from("interviews")
      .update({ publicSlug: slug, isActive: true })
      .eq("id", interview.id);

    if (publishError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: publishError.message,
      });
    }

    const modeUsed = "VOICE";
    const firstQuestionId = insertedQuestions?.[0]?.id ?? null;

    const { data: sessionJson, error: sessionError } = await ctx.supabase.rpc(
      "create_interview_session",
      {
        p_interview_id: interview.id,
        p_participant_name: profile.name ?? null,
        p_participant_email: profile.email,
        p_mode_used: modeUsed,
        p_current_question_id: firstQuestionId,
      },
    );

    if (sessionError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: sessionError.message,
      });
    }

    const session = sessionJson as { id: string };

    const participantMetadata: Record<string, string> = {
      source: "practice",
      role: roleTitle,
    };
    const companyTrimmed = input.company?.trim();
    if (companyTrimmed) participantMetadata.company = companyTrimmed;
    const jdUrl = input.jobDescriptionUrl?.trim();
    if (jdUrl) participantMetadata.jobDescriptionUrl = jdUrl;
    const resumeFileName = input.resumeFileName?.trim();
    if (resumeFileName) participantMetadata.resumeFileName = resumeFileName;

    await ctx.supabase
      .from("sessions")
      .update({ participantMetadata })
      .eq("id", session.id);

    const warnings: string[] = [];
    if (urlFetchFailed) {
      warnings.push(
        "We could not load text from the job posting URL. Your interview was created using your role and any pasted job description.",
      );
    }

    return {
      sessionId: session.id,
      slug,
      redirectUrl: `/i/${slug}/session?sid=${session.id}`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }),

  listMySessions: protectedProcedure.query(async ({ ctx }) => {
    const profile = await assertCandidateProfile(ctx.supabase, ctx.user.id);
    const sessions = await fetchMyPracticeSessions(
      ctx.supabase,
      ctx.user.id,
      profile.email,
    );

    const mapped = sessions.map(mapSessionRow);
    const completed = mapped.filter((s) => s.status === "COMPLETED");
    const scores = completed
      .map((s) => s.score)
      .filter((s): s is number => s != null);

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : null;

    return {
      sessions: mapped,
      stats: {
        total: mapped.length,
        completed: completed.length,
        averageScore,
      },
    };
  }),

  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const profile = await assertCandidateProfile(ctx.supabase, ctx.user.id);
    const sessions = await fetchMyPracticeSessions(
      ctx.supabase,
      ctx.user.id,
      profile.email,
    );

    const mapped = sessions.map(mapSessionRow);
    const completed = mapped.filter((s) => s.status === "COMPLETED");
    const scores = completed
      .map((s) => s.score)
      .filter((s): s is number => s != null);

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : null;
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    const totalPracticeSeconds = completed.reduce(
      (sum, s) => sum + (s.durationSeconds > 0 ? s.durationSeconds : (s.plannedMinutes ?? 0) * 60),
      0,
    );

    const scoreTrend = completed
      .filter((s) => s.score != null)
      .map((s) => ({
        date: s.date.slice(0, 10),
        score: s.score as number,
        sessionId: s.id,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      stats: {
        sessionsCompleted: completed.length,
        averageScore,
        bestScore,
        totalPracticeSeconds,
      },
      scoreTrend,
      topThemes: collectTopThemes(sessions, 5),
      improvementAreas: collectImprovementAreas(sessions, 8),
      recentSessions: mapped.slice(0, 5),
    };
  }),

  getSessionReport: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await assertCandidateProfile(ctx.supabase, ctx.user.id);

      const { data: session, error } = await ctx.supabase
        .from("sessions")
        .select(
          `
          id,
          status,
          participantEmail,
          interview:interviews!inner(id, userId)
        `,
        )
        .eq("id", input.sessionId)
        .single();

      if (error || !session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found" });
      }

      const rawInterview = session.interview as
        | { id: string; userId: string }
        | { id: string; userId: string }[];
      const interview = Array.isArray(rawInterview) ? rawInterview[0] : rawInterview;
      if (!interview) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found" });
      }

      if (
        interview.userId !== ctx.user.id ||
        session.participantEmail?.toLowerCase() !== profile.email.toLowerCase()
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this report" });
      }

      return { interviewId: interview.id };
    }),
});
