export const DEFAULT_TTS_BARGE_IN_MIN_AUDIO_MS = 400;
export const DEFAULT_TTS_BARGE_IN_MIN_AUDIO_BYTES = 32_000;

export type RealtimeMessageRole = "user" | "assistant" | "system";

export type RealtimeTextContent =
  | { type: "input_text"; text: string }
  | { type: "output_text"; text: string };

/** GA Realtime API: user/system use input_text; assistant uses output_text. */
export function buildRealtimeTextContent(
  role: RealtimeMessageRole,
  text: string,
): RealtimeTextContent[] {
  if (role === "assistant") {
    return [{ type: "output_text", text }];
  }
  return [{ type: "input_text", text }];
}

export function buildRealtimeConversationMessageItem(
  role: RealtimeMessageRole,
  text: string,
): {
  type: "message";
  role: RealtimeMessageRole;
  content: RealtimeTextContent[];
} {
  return {
    type: "message",
    role,
    content: buildRealtimeTextContent(role, text),
  };
}

export function buildRealtimeConversationCreateEvent(
  role: RealtimeMessageRole,
  text: string,
): {
  type: "conversation.item.create";
  item: ReturnType<typeof buildRealtimeConversationMessageItem>;
} {
  return {
    type: "conversation.item.create",
    item: buildRealtimeConversationMessageItem(role, text),
  };
}

export interface TtsBargeInDecision {
  inEchoCooldown: boolean;
  modelIsSpeaking: boolean;
  responseAudioStarted: boolean;
  ttsAudioStartedAt: number;
  nowMs: number;
  responseTtsBytes: number;
  rms: number;
  thresholdRms: number;
  consecutiveFrames: number;
  thresholdFrames: number;
  minAudioMs?: number;
  minAudioBytes?: number;
}

export const DEFAULT_MIN_COMMIT_WORDS = 8;
export const DEFAULT_MIN_COMMIT_CHARS = 40;
export const DEFAULT_FRAGMENT_MERGE_MS = 4000;
export const DEFAULT_COACH_FRAGMENT_MERGE_MS = 5000;
export const DEFAULT_SPEECH_STARTED_RECENT_MS = 2500;
export const DEFAULT_MOCK_ANSWER_COMPLETION_MS = 2500;
export const DEFAULT_STRICT_NAV_MAX_WORDS = 6;

export interface TranscriptCommitThresholds {
  minWords: number;
  minChars: number;
  fragmentMergeMs: number;
}

export interface VoiceTranscriptTiming {
  speechStopFinalizeMs: number;
  transcriptStabilityMs: number;
  transcriptMaxWaitMs: number;
}

const FILLER_ONLY_PATTERNS: RegExp[] = [
  /^well[,.!?\s]*$/i,
  /^yeah[,.!?\s]*$/i,
  /^yes[,.!?\s]*$/i,
  /^no[,.!?\s]*$/i,
  /^um+[,.!?\s]*$/i,
  /^uh+[,.!?\s]*$/i,
  /^i think[,.!?\s]*$/i,
  /^well,?\s+i know[,.!?\s]*$/i,
  /^you know[,.!?\s]*$/i,
  /^so[,.!?\s]*$/i,
  /^okay[,.!?\s]*$/i,
  /^ok[,.!?\s]*$/i,
];

export function readEnvInt(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: number,
): number {
  const raw = env[key];
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function countTranscriptWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function isFillerOnlyTranscript(text: string): boolean {
  const normalized = text.trim().replace(/[.,!?]+$/g, "").trim();
  if (!normalized) return true;
  return FILLER_ONLY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isSubstantiveTranscript(
  text: string,
  thresholds: Pick<TranscriptCommitThresholds, "minWords" | "minChars">,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isFillerOnlyTranscript(trimmed)) return false;
  return (
    countTranscriptWords(trimmed) >= thresholds.minWords &&
    trimmed.length >= thresholds.minChars
  );
}

export function readTranscriptCommitThresholds(
  env: Record<string, string | undefined>,
  practiceMode?: "mock" | "coach",
): TranscriptCommitThresholds {
  const minWords = readEnvInt(env, "VOICE_MIN_COMMIT_WORDS", DEFAULT_MIN_COMMIT_WORDS);
  const minChars = readEnvInt(env, "VOICE_MIN_COMMIT_CHARS", DEFAULT_MIN_COMMIT_CHARS);
  const fragmentMergeMs =
    practiceMode === "coach"
      ? readEnvInt(env, "VOICE_COACH_FRAGMENT_MERGE_MS", DEFAULT_COACH_FRAGMENT_MERGE_MS)
      : readEnvInt(env, "VOICE_FRAGMENT_MERGE_MS", DEFAULT_FRAGMENT_MERGE_MS);

  if (practiceMode === "coach") {
    return {
      minWords: Math.max(minWords, 10),
      minChars: Math.max(minChars, 50),
      fragmentMergeMs,
    };
  }

  return { minWords, minChars, fragmentMergeMs };
}

export function readVoiceTranscriptTiming(
  practiceMode?: "mock" | "coach",
): VoiceTranscriptTiming {
  if (practiceMode === "coach") {
    return {
      speechStopFinalizeMs: 2400,
      transcriptStabilityMs: 1200,
      transcriptMaxWaitMs: 5500,
    };
  }
  return {
    speechStopFinalizeMs: DEFAULT_MOCK_ANSWER_COMPLETION_MS,
    transcriptStabilityMs: 900,
    transcriptMaxWaitMs: 4500,
  };
}

export function normalizeNavigationPhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STRICT_FAST_NEXT_EXACT = new Set([
  "next question",
  "move on",
  "skip",
  "go next",
  "下一个问题",
  "下一题",
  "跳过",
]);

const STRICT_FAST_PREV_EXACT = new Set([
  "previous question",
  "go back",
  "上一个问题",
  "上一题",
]);

/** Short, unambiguous skip/next commands only — not embedded in long utterances. */
export function isStrictFastNextRequest(
  text: string,
  maxWords = DEFAULT_STRICT_NAV_MAX_WORDS,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const words = countTranscriptWords(trimmed);
  if (words > maxWords) return false;
  const normalized = normalizeNavigationPhrase(trimmed);
  if (STRICT_FAST_NEXT_EXACT.has(normalized)) return true;
  return /^(?:next\s*question|move\s+on|skip|go\s+next)\.?$/i.test(normalized);
}

export function isStrictFastPrevRequest(
  text: string,
  maxWords = DEFAULT_STRICT_NAV_MAX_WORDS,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const words = countTranscriptWords(trimmed);
  if (words > maxWords) return false;
  const normalized = normalizeNavigationPhrase(trimmed);
  if (STRICT_FAST_PREV_EXACT.has(normalized)) return true;
  return /^(?:previous\s*question|go\s+back)\.?$/i.test(normalized);
}

export interface PreFlushDeferInput {
  userSpeaking: boolean;
  lastSpeechStartedAt: number;
  nowMs: number;
  recentSpeechMs?: number;
}

export function shouldDeferPreFlush(input: PreFlushDeferInput): boolean {
  if (input.userSpeaking) return true;
  const recentMs = input.recentSpeechMs ?? DEFAULT_SPEECH_STARTED_RECENT_MS;
  if (
    input.lastSpeechStartedAt > 0 &&
    input.nowMs - input.lastSpeechStartedAt < recentMs
  ) {
    return true;
  }
  return false;
}

export function shouldDeferFlush(input: PreFlushDeferInput): boolean {
  return shouldDeferPreFlush(input);
}

export interface ResponseCreateBlockInput {
  userSpeaking: boolean;
  lastSpeechStartedAt: number;
  lastSpeechStoppedAt: number;
  nowMs: number;
  hasPendingTranscript: boolean;
  transcriptStabilizing: boolean;
  recentSpeechMs?: number;
}

export function isSpeechResumedAfterStop(
  lastSpeechStartedAt: number,
  lastSpeechStoppedAt: number,
): boolean {
  return (
    lastSpeechStartedAt > 0 &&
    lastSpeechStoppedAt > 0 &&
    lastSpeechStartedAt >= lastSpeechStoppedAt
  );
}

/** Blocks response.create while the user may still be answering. */
export function shouldBlockVoiceResponseCreate(
  input: ResponseCreateBlockInput,
): { block: boolean; reason?: string } {
  if (input.userSpeaking) {
    return { block: true, reason: "userSpeaking=true" };
  }
  const recentMs = input.recentSpeechMs ?? DEFAULT_SPEECH_STARTED_RECENT_MS;
  if (
    input.lastSpeechStartedAt > 0 &&
    input.nowMs - input.lastSpeechStartedAt < recentMs
  ) {
    return { block: true, reason: "speech_started within recent window" };
  }
  if (isSpeechResumedAfterStop(input.lastSpeechStartedAt, input.lastSpeechStoppedAt)) {
    return { block: true, reason: "speech resumed after last stop" };
  }
  if (input.transcriptStabilizing) {
    return { block: true, reason: "ASR still stabilizing" };
  }
  if (input.hasPendingTranscript) {
    return { block: true, reason: "pending user transcript" };
  }
  return { block: false };
}

/** Blocks mock auto-response timer until silence is stable (pending transcript allowed). */
export function shouldBlockMockAutoResponse(
  input: Omit<ResponseCreateBlockInput, "hasPendingTranscript">,
): { block: boolean; reason?: string } {
  if (input.userSpeaking) {
    return { block: true, reason: "userSpeaking=true" };
  }
  const recentMs = input.recentSpeechMs ?? DEFAULT_SPEECH_STARTED_RECENT_MS;
  if (
    input.lastSpeechStartedAt > 0 &&
    input.nowMs - input.lastSpeechStartedAt < recentMs
  ) {
    return { block: true, reason: "speech_started within recent window" };
  }
  if (isSpeechResumedAfterStop(input.lastSpeechStartedAt, input.lastSpeechStoppedAt)) {
    return { block: true, reason: "speech resumed after last stop" };
  }
  if (input.transcriptStabilizing) {
    return { block: true, reason: "ASR still stabilizing" };
  }
  return { block: false };
}

export function canMockAutoRespondAfterSilence(
  input: Omit<ResponseCreateBlockInput, "hasPendingTranscript"> & {
    hasTranscript: boolean;
  },
): boolean {
  if (!input.hasTranscript) return false;
  return !shouldBlockMockAutoResponse(input).block;
}

export interface EmptyResponseRetrySuppressInput {
  userSpeaking: boolean;
  lastSpeechStartedAt: number;
  nowMs: number;
  respStatus: string;
  hasPendingTranscript: boolean;
  recentSpeechMs?: number;
}

export function shouldSuppressEmptyResponseRetry(
  input: EmptyResponseRetrySuppressInput,
): { suppress: boolean; reason?: string } {
  if (input.userSpeaking) {
    return { suppress: true, reason: "user is speaking" };
  }
  const recentMs = input.recentSpeechMs ?? DEFAULT_SPEECH_STARTED_RECENT_MS;
  if (
    input.lastSpeechStartedAt > 0 &&
    input.nowMs - input.lastSpeechStartedAt < recentMs
  ) {
    return { suppress: true, reason: "speech_started recently" };
  }
  if (input.hasPendingTranscript) {
    return { suppress: true, reason: "pending user transcript" };
  }
  if (input.respStatus === "cancelled") {
    return { suppress: true, reason: "response cancelled (likely barge-in)" };
  }
  return { suppress: false };
}

export function isWithinFragmentMergeWindow(
  nowMs: number,
  anchorMs: number,
  fragmentMergeMs: number,
): boolean {
  if (anchorMs <= 0) return false;
  return nowMs - anchorMs <= fragmentMergeMs;
}

export function shouldAllowTtsBargeIn({
  inEchoCooldown,
  modelIsSpeaking,
  responseAudioStarted,
  ttsAudioStartedAt,
  nowMs,
  responseTtsBytes,
  rms,
  thresholdRms,
  consecutiveFrames,
  thresholdFrames,
  minAudioMs = DEFAULT_TTS_BARGE_IN_MIN_AUDIO_MS,
  minAudioBytes = DEFAULT_TTS_BARGE_IN_MIN_AUDIO_BYTES,
}: TtsBargeInDecision): boolean {
  if (!inEchoCooldown || !modelIsSpeaking || !responseAudioStarted) return false;
  if (ttsAudioStartedAt <= 0) return false;
  if (nowMs - ttsAudioStartedAt < minAudioMs) return false;
  if (responseTtsBytes < minAudioBytes) return false;
  if (rms < thresholdRms) return false;
  if (consecutiveFrames < thresholdFrames) return false;
  return true;
}
