export type PostInterviewRedirectInput = {
  sessionId: string;
  interviewId: string;
  isPractice: boolean;
  isPreview: boolean;
  isInviteFlow: boolean;
  isAuthenticated: boolean;
  userType?: "candidate" | "recruiter" | null;
};

export type PostInterviewRedirectPlan = {
  /** When set, navigate here after completion processing. */
  redirectPath: string | null;
  /** Thank-you only (no dashboard); stay on completion UI. */
  thankYouOnly: boolean;
  /** Primary CTA when feedback is still processing. */
  fallbackPath: string;
  isRecruiter: boolean;
  isCandidatePractice: boolean;
};

export function resolvePostInterviewRedirect(
  input: PostInterviewRedirectInput,
): PostInterviewRedirectPlan {
  const {
    sessionId,
    interviewId,
    isPractice,
    isPreview,
    isInviteFlow,
    isAuthenticated,
    userType,
  } = input;

  const resultsPath = `/interviews/${interviewId}/results?session=${sessionId}`;
  const practiceReportPath = `/my-sessions/${sessionId}`;
  const mySessionsPath = "/my-sessions";
  const isRecruiter = isAuthenticated && userType === "recruiter";

  if (
    isInviteFlow &&
    (!isAuthenticated || userType !== "candidate")
  ) {
    return {
      redirectPath: null,
      thankYouOnly: true,
      fallbackPath: mySessionsPath,
      isRecruiter: false,
      isCandidatePractice: false,
    };
  }

  if (!isAuthenticated && !isPractice && !isPreview) {
    return {
      redirectPath: null,
      thankYouOnly: true,
      fallbackPath: mySessionsPath,
      isRecruiter: false,
      isCandidatePractice: false,
    };
  }

  if (isPractice && isAuthenticated) {
    return {
      redirectPath: practiceReportPath,
      thankYouOnly: false,
      fallbackPath: practiceReportPath,
      isRecruiter: false,
      isCandidatePractice: true,
    };
  }

  if (isPreview || isRecruiter) {
    return {
      redirectPath: resultsPath,
      thankYouOnly: false,
      fallbackPath: resultsPath,
      isRecruiter: true,
      isCandidatePractice: false,
    };
  }

  if (isAuthenticated && userType === "candidate") {
    return {
      redirectPath: practiceReportPath,
      thankYouOnly: false,
      fallbackPath: practiceReportPath,
      isRecruiter: false,
      isCandidatePractice: true,
    };
  }

  return {
    redirectPath: "/dashboard",
    thankYouOnly: false,
    fallbackPath: "/dashboard",
    isRecruiter: false,
    isCandidatePractice: false,
  };
}
