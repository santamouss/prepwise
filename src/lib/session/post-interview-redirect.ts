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
  /** Target for “view sessions” when feedback is still processing. */
  sessionsListPath: string;
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

  if (
    isInviteFlow &&
    (!isAuthenticated || userType !== "candidate")
  ) {
    return {
      redirectPath: null,
      thankYouOnly: true,
      sessionsListPath: mySessionsPath,
    };
  }

  if (isPractice && isAuthenticated && userType === "candidate") {
    return {
      redirectPath: practiceReportPath,
      thankYouOnly: false,
      sessionsListPath: mySessionsPath,
    };
  }

  if (isPractice && isAuthenticated) {
    return {
      redirectPath: practiceReportPath,
      thankYouOnly: false,
      sessionsListPath: mySessionsPath,
    };
  }

  if (isPreview || (isAuthenticated && userType === "recruiter")) {
    return {
      redirectPath: resultsPath,
      thankYouOnly: false,
      sessionsListPath: resultsPath,
    };
  }

  if (isAuthenticated && userType === "candidate") {
    return {
      redirectPath: practiceReportPath,
      thankYouOnly: false,
      sessionsListPath: mySessionsPath,
    };
  }

  return {
    redirectPath: "/dashboard",
    thankYouOnly: false,
    sessionsListPath: "/dashboard",
  };
}
