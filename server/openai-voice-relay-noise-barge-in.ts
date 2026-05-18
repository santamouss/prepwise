export const DEFAULT_NOISE_BARGE_IN_DEBOUNCE_MS = 500;

export const RESUME_ASSISTANT_RESPONSE_REASON = "noise resume assistant";

export type NoiseBargeInState = {
  possibleBargeIn: boolean;
  assistantInterrupted: boolean;
  interruptedAssistantText: string;
};

export function createNoiseBargeInState(): NoiseBargeInState {
  return {
    possibleBargeIn: false,
    assistantInterrupted: false,
    interruptedAssistantText: "",
  };
}

export function isAssistantActivelySpeaking(input: {
  responseInFlight: boolean;
  modelIsSpeaking: boolean;
  responseAudioStarted: boolean;
  outputTranscriptBuffer: string;
}): boolean {
  return (
    input.responseInFlight ||
    input.modelIsSpeaking ||
    input.responseAudioStarted ||
    !!input.outputTranscriptBuffer.trim()
  );
}

export function shouldDeferCancelOnAssistantSpeechStarted(
  assistantSpeaking: boolean,
): boolean {
  return assistantSpeaking;
}

export function shouldResumeAfterRejectedNoise(input: {
  possibleBargeIn: boolean;
  assistantInterrupted: boolean;
  transcriptRejected: boolean;
}): boolean {
  return (
    input.transcriptRejected &&
    input.possibleBargeIn &&
    input.assistantInterrupted
  );
}

export function shouldConfirmCancelOnAcceptedBargeIn(input: {
  possibleBargeIn: boolean;
  assistantInterrupted: boolean;
  transcriptAccepted: boolean;
}): boolean {
  return (
    input.possibleBargeIn &&
    input.transcriptAccepted &&
    !input.assistantInterrupted
  );
}

export function buildResumeAssistantSystemInstruction(options: {
  interruptedText: string;
  currentQuestionIndex: number;
}): string {
  const questionHint =
    options.currentQuestionIndex > 0
      ? `Continue from question ${options.currentQuestionIndex + 1}. Do NOT restart the interview or return to question 1 unless you were still on question 1.`
      : "Continue with question 1 only if you had not finished asking it yet.";
  const snippet = options.interruptedText.trim()
    ? ` You were saying: "${options.interruptedText.trim().slice(0, 500)}"`
    : "";
  return `[SYSTEM] The participant's microphone picked up brief background noise that was not real speech. Continue or repeat the question or coaching feedback you were giving before the interruption.${snippet} ${questionHint} Do not restart the entire interview.`;
}
