export type PracticeInterviewType =
  | "BEHAVIORAL"
  | "ROLE_SPECIFIC"
  | "TECHNICAL"
  | "SALES"
  | "LEADERSHIP";

export type PracticeMode = "voice" | "chat";

export type PracticeDuration = 5 | 10 | 15;

export const PRACTICE_INTERVIEW_TYPE_LABELS: Record<PracticeInterviewType, string> = {
  BEHAVIORAL: "Behavioral",
  ROLE_SPECIFIC: "Role-Specific",
  TECHNICAL: "Technical",
  SALES: "Sales",
  LEADERSHIP: "Leadership",
};

export function practiceQuestionCount(duration: PracticeDuration): number {
  switch (duration) {
    case 5:
      return 3;
    case 10:
      return 5;
    case 15:
      return 7;
    default:
      return 5;
  }
}

export function practiceFollowUpDepth(
  duration: PracticeDuration,
): "LIGHT" | "MODERATE" | "DEEP" {
  return duration === 5 ? "LIGHT" : "MODERATE";
}

export function buildPracticeGeneratorDescription(input: {
  role: string;
  company?: string;
  interviewType: PracticeInterviewType;
  duration: PracticeDuration;
}): string {
  const typeLabel = PRACTICE_INTERVIEW_TYPE_LABELS[input.interviewType];
  const companyPart = input.company?.trim()
    ? ` Target company or industry: ${input.company.trim()}.`
    : "";

  return [
    `Design a ${typeLabel.toLowerCase()} mock interview for a candidate practicing for the role: ${input.role.trim()}.`,
    companyPart,
    ` Generate exactly ${practiceQuestionCount(input.duration)} interview questions suitable for a ${input.duration}-minute practice session.`,
    " The interviewer persona is Parker — warm, supportive, and encouraging.",
    input.interviewType === "TECHNICAL"
      ? " Include at least one technical depth question; use CODING type only if a live coding exercise is essential."
      : "",
    input.interviewType === "SALES"
      ? " Emphasize discovery, objection handling, and closing scenarios."
      : "",
    input.interviewType === "LEADERSHIP"
      ? " Emphasize leadership scenarios, team dynamics, and decision-making."
      : "",
  ]
    .filter(Boolean)
    .join("");
}
