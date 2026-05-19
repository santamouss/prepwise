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
export const MOCK_ANSWER_COMPLETION_REASON = "mock answer completion";
export const DEFAULT_SPEECH_STARTED_RECENT_MS = 3000;
export const DEFAULT_MOCK_ANSWER_COMPLETION_MS = 3000;
export const DEFAULT_STRICT_NAV_MAX_WORDS = 6;
export const DEFAULT_CLEAR_NEXT_COMMAND_MAX_WORDS = 10;

/** Coach mode: patient server VAD; responses only via relay (create_response: false). */
export const COACH_SERVER_VAD_TURN_DETECTION = {
  type: "server_vad" as const,
  threshold: 0.65,
  prefix_padding_ms: 400,
  silence_duration_ms: 6500,
  create_response: false,
};

/** Mock technical practice: longer silence before turn end than behavioral mock. */
export const MOCK_TECHNICAL_SERVER_VAD_TURN_DETECTION = {
  type: "server_vad" as const,
  threshold: 0.55,
  prefix_padding_ms: 350,
  silence_duration_ms: 4800,
  create_response: false,
};

/** Mock mode: semantic VAD with low eagerness; responses driven by relay logic. */
export const MOCK_SEMANTIC_VAD_TURN_DETECTION = {
  type: "semantic_vad" as const,
  eagerness: "low" as const,
  create_response: false,
  interrupt_response: true,
};

export type PracticeTurnDetectionContext = {
  practiceMode?: "mock" | "coach";
  practiceInterviewType?: string;
  isPractice?: boolean;
};

export function buildPracticeTurnDetection(
  ctx?: PracticeTurnDetectionContext | "mock" | "coach",
): typeof COACH_SERVER_VAD_TURN_DETECTION | typeof MOCK_SEMANTIC_VAD_TURN_DETECTION | typeof MOCK_TECHNICAL_SERVER_VAD_TURN_DETECTION {
  const practiceMode =
    typeof ctx === "string" ? ctx : ctx?.practiceMode;
  const interviewType =
    typeof ctx === "string" ? undefined : ctx?.practiceInterviewType;
  const isPractice = typeof ctx === "string" ? true : ctx?.isPractice !== false;

  if (practiceMode === "coach") {
    return COACH_SERVER_VAD_TURN_DETECTION;
  }
  if (isPractice && interviewType === "TECHNICAL") {
    return MOCK_TECHNICAL_SERVER_VAD_TURN_DETECTION;
  }
  return MOCK_SEMANTIC_VAD_TURN_DETECTION;
}

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
  /^yep[,.!?\s]*$/i,
  /^yup[,.!?\s]*$/i,
  /^yes[,.!?\s]*$/i,
  /^no[,.!?\s]*$/i,
  /^um+[,.!?\s]*$/i,
  /^uh+[,.!?\s]*$/i,
  /^mm+[,.!?\s]*$/i,
  /^hm+[,.!?\s]*$/i,
  /^hmm[,.!?\s]*$/i,
  /^hello[,.!?\s]*$/i,
  /^hi[,.!?\s]*$/i,
  /^hey[,.!?\s]*$/i,
  /^bye[,.!?\s]*$/i,
  /^bye[,.!?\s-]*bye[,.!?\s]*$/i,
  /^okay[,.!?\s]*$/i,
  /^ok[,.!?\s]*$/i,
  /^i think[,.!?\s]*$/i,
  /^well,?\s+i know[,.!?\s]*$/i,
  /^you know[,.!?\s]*$/i,
  /^so[,.!?\s]*$/i,
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
  options?: Pick<TranscriptAcceptanceOptions, "lastParkerTurnAtMs" | "nowMs">,
): boolean {
  return evaluateTranscriptForAcceptance(text, thresholds, {
    isFillerOnly: isFillerOnlyTranscript,
    ...options,
  }).accept;
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

export { mergeAsrText } from "../src/lib/voice/merge-asr-text";

export function isTranscriptReadyAfterSilence(
  nowMs: number,
  lastTranscriptUpdateAt: number,
  lastSpeechStoppedAt: number,
  stabilityMs: number,
  minSilenceAfterStopMs: number,
  maxWaitMs: number,
): boolean {
  if (lastSpeechStoppedAt <= 0) return false;
  const sinceSpeechStop = nowMs - lastSpeechStoppedAt;
  if (sinceSpeechStop < minSilenceAfterStopMs) return false;
  const sinceUpdate = lastTranscriptUpdateAt > 0 ? nowMs - lastTranscriptUpdateAt : Number.POSITIVE_INFINITY;
  return sinceUpdate >= stabilityMs || sinceSpeechStop >= maxWaitMs;
}

const THINKING_PAUSE_PHRASES: RegExp[] = [
  /\blet me think\b/i,
  /\bgive me a (?:moment|second|minute|sec)\b/i,
  /\bneed (?:a )?(?:moment|second|minute)\b/i,
  /\bone (?:moment|second|minute)\b/i,
  /\bhang on\b/i,
  /\bhold on\b/i,
  /\bi need to think\b/i,
];

export function isThinkingPauseRequest(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return THINKING_PAUSE_PHRASES.some((pattern) => pattern.test(normalized));
}

export function readVoiceTranscriptTiming(
  practiceMode?: "mock" | "coach",
  practiceInterviewType?: string,
): VoiceTranscriptTiming {
  if (practiceMode === "coach") {
    return {
      speechStopFinalizeMs: 5500,
      transcriptStabilityMs: 1600,
      transcriptMaxWaitMs: 8000,
    };
  }
  if (practiceInterviewType === "TECHNICAL") {
    return {
      speechStopFinalizeMs: 4500,
      transcriptStabilityMs: 1100,
      transcriptMaxWaitMs: 6500,
    };
  }
  return {
    speechStopFinalizeMs: DEFAULT_MOCK_ANSWER_COMPLETION_MS,
    transcriptStabilityMs: 900,
    transcriptMaxWaitMs: 4500,
  };
}

export type VoiceNavigationDecision = {
  accepted: boolean;
  commandPhrase: string;
  normalized: string;
};

/** Authoritative short navigation phrases only — no fuzzy/embedded matches. */
export function evaluateVoiceNavigationCommand(
  text: string,
  maxWords = DEFAULT_CLEAR_NEXT_COMMAND_MAX_WORDS,
): VoiceNavigationDecision {
  const command = isClearNextQuestionCommand(text, maxWords);
  return {
    accepted: command.detected,
    commandPhrase: command.commandPhrase,
    normalized: command.normalized,
  };
}

export function normalizeNavigationPhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LEADING_NAVIGATION_FILLERS = new Set([
  "hello",
  "hey",
  "hi",
  "um",
  "uh",
  "yeah",
  "yes",
  "ok",
  "okay",
  "well",
  "so",
]);

const CLEAR_NEXT_EXACT = new Set([
  "next question",
  "move on",
  "skip",
  "skip this",
  "skip this one",
  "go next",
  "can we move on",
  "can we go to the next question",
  "lets move on",
  "let s move on",
  "下一个问题",
  "下一题",
  "跳过",
]);

const CLEAR_NEXT_PATTERNS: RegExp[] = [
  /^next\s+question$/,
  /^move\s+on$/,
  /^skip(?:\s+this(?:\s+one)?)?$/,
  /^go\s+next$/,
  /^can\s+we\s+move\s+on$/,
  /^can\s+we\s+go\s+to\s+the\s+next\s+question$/,
  /^let'?s\s+move\s+on$/,
  /^please\s+move\s+on$/,
  /^could\s+we\s+move\s+on$/,
];

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

export function stripLeadingNavigationFillers(normalized: string): string {
  const words = normalized.split(/\s+/).filter(Boolean);
  while (words.length > 0 && LEADING_NAVIGATION_FILLERS.has(words[0])) {
    words.shift();
  }
  return words.join(" ").trim();
}

export type ClearNextCommandResult = {
  detected: boolean;
  normalized: string;
  commandPhrase: string;
};

/** Detect short, clear skip/next commands (with optional leading filler like "hello"). */
export function isClearNextQuestionCommand(
  text: string,
  maxWords = DEFAULT_CLEAR_NEXT_COMMAND_MAX_WORDS,
): ClearNextCommandResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { detected: false, normalized: "", commandPhrase: "" };
  }

  const normalized = normalizeNavigationPhrase(trimmed);
  const words = countTranscriptWords(normalized);
  if (words > maxWords) {
    return { detected: false, normalized, commandPhrase: "" };
  }

  const commandPhrase = stripLeadingNavigationFillers(normalized);
  if (!commandPhrase) {
    return { detected: false, normalized, commandPhrase: "" };
  }

  if (CLEAR_NEXT_EXACT.has(commandPhrase)) {
    return { detected: true, normalized, commandPhrase };
  }

  if (CLEAR_NEXT_PATTERNS.some((pattern) => pattern.test(commandPhrase))) {
    return { detected: true, normalized, commandPhrase };
  }

  return { detected: false, normalized, commandPhrase };
}

export function isNoisyEmbeddedNextCommandCandidate(
  text: string,
  maxWords = DEFAULT_CLEAR_NEXT_COMMAND_MAX_WORDS,
): boolean {
  const normalized = normalizeNavigationPhrase(text.trim());
  if (!normalized) return false;
  if (countTranscriptWords(normalized) <= maxWords) return false;
  return (
    /\bnext\s+question\b/.test(normalized) ||
    /\bmove\s+on\b/.test(normalized) ||
    /\bcan\s+we\s+move\s+on\b/.test(normalized)
  );
}

/** Short, unambiguous skip/next commands only — not embedded in long utterances. */
export function isStrictFastNextRequest(
  text: string,
  maxWords = DEFAULT_STRICT_NAV_MAX_WORDS,
): boolean {
  return isClearNextQuestionCommand(text, maxWords).detected;
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

/** Hard guard: never response.create while user may still be answering. */
export function shouldBlockResponseCreateHard(
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
  return { block: false };
}

/** Blocks response.create while the user may still be answering. */
export function shouldBlockVoiceResponseCreate(
  input: ResponseCreateBlockInput,
): { block: boolean; reason?: string } {
  const hard = shouldBlockResponseCreateHard(input);
  if (hard.block) return hard;
  if (input.hasPendingTranscript) {
    return { block: true, reason: "pending user transcript" };
  }
  return { block: false };
}

export function isAllowedMockResponseCreateReason(reason: string): boolean {
  return reason === MOCK_ANSWER_COMPLETION_REASON;
}

/** Mock interviews must not commit transcripts from debounced flush / pre-flush paths. */
export function shouldBlockMockTranscriptCommit(
  reason: string,
  input: ResponseCreateBlockInput,
): boolean {
  if (reason === "flush" || reason === "response pre-flush") {
    return true;
  }
  if (reason === "voice command") {
    return input.userSpeaking;
  }
  if (input.userSpeaking) {
    return true;
  }
  if (reason !== MOCK_ANSWER_COMPLETION_REASON) {
    return shouldBlockResponseCreateHard(input).block;
  }
  return false;
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

// ── Accidental noise / short fragment filtering ─────────────────────────

export const DEFAULT_MIN_SPEECH_SEGMENT_MS = 500;
export const DEFAULT_LIVE_TRANSCRIPT_MIN_WORDS = 4;
export const DEFAULT_LIVE_TRANSCRIPT_MIN_CHARS = 20;
export const DEFAULT_LIVE_TRANSCRIPT_STABLE_MS = 1200;
export const DEFAULT_MAX_NOISE_FRAGMENT_WORDS = 3;
export const DEFAULT_LOW_CONFIDENCE_LOGPROB_THRESHOLD = -1.0;
export const DEFAULT_SHORT_ANSWER_PARKER_TURN_MS = 30_000;
export const SHORT_ANSWER_MAX_WORDS = 3;

const NOISE_FRAGMENT_EXACT = new Set([
  "bye",
  "bye bye",
  "bye-bye",
  "yeah",
  "yep",
  "yup",
  "okay",
  "ok",
  "hello",
  "hi",
  "hey",
  "mm",
  "mmm",
  "hmm",
  "hm",
  "uh",
  "um",
  "ah",
  "oh",
  "huh",
  "well",
  "so",
  "you",
  "thanks",
  "thank you",
  "goodbye",
]);

const SHORT_SUBSTANTIVE_ALLOWLIST = new Set([
  "google",
  "python",
  "typescript",
  "javascript",
  "react",
  "java",
  "kotlin",
  "swift",
  "golang",
  "rust",
  "ruby",
  "sql",
  "aws",
  "azure",
  "kubernetes",
  "docker",
  "yes",
  "no",
  "true",
  "false",
  "star",
]);

const COACH_CONTROL_PATTERNS: RegExp[] = [
  /\bi m done\b/,
  /\bdone answering\b/,
  /\bfinished answering\b/,
  /\btry again\b/,
  /\blet me try\b/,
  /\bretry\b/,
  /\bone more time\b/,
];

export function normalizeTranscriptForNoise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedShortSubstantiveAnswer(text: string): boolean {
  const normalized = normalizeTranscriptForNoise(text);
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;
  if (words.length === 1 && SHORT_SUBSTANTIVE_ALLOWLIST.has(words[0]!)) {
    return true;
  }
  return words.every((word) => SHORT_SUBSTANTIVE_ALLOWLIST.has(word));
}

export function isCoachControlTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normalized = normalizeTranscriptForNoise(trimmed);
  return COACH_CONTROL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isExemptFromParkerTurnWindow(text: string): boolean {
  return (
    isClearNextQuestionCommand(text).detected || isCoachControlTranscript(text)
  );
}

export function isSubThreeWordTranscript(text: string): boolean {
  return countTranscriptWords(text.trim()) < SHORT_ANSWER_MAX_WORDS;
}

export function hasRecentParkerTurn(
  lastParkerTurnAtMs: number,
  nowMs: number,
  windowMs = DEFAULT_SHORT_ANSWER_PARKER_TURN_MS,
): boolean {
  return lastParkerTurnAtMs > 0 && nowMs - lastParkerTurnAtMs <= windowMs;
}

export function requiresRecentParkerTurnForShortAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!isSubThreeWordTranscript(trimmed)) return false;
  return !isExemptFromParkerTurnWindow(trimmed);
}

export type TranscriptAcceptanceOptions = {
  logprobs?: number[] | null;
  isFillerOnly?: (t: string) => boolean;
  lastParkerTurnAtMs?: number;
  nowMs?: number;
};

export function isProtectedShortTranscript(text: string): boolean {
  if (isClearNextQuestionCommand(text).detected) return true;
  if (isCoachControlTranscript(text)) return true;
  if (isAllowedShortSubstantiveAnswer(text)) return true;
  return false;
}

export function isRejectableNoiseFragment(
  text: string,
  maxNoiseWords = DEFAULT_MAX_NOISE_FRAGMENT_WORDS,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (isProtectedShortTranscript(trimmed)) return false;

  const wordCount = countTranscriptWords(trimmed);
  if (wordCount >= maxNoiseWords) return false;

  const normalized = normalizeTranscriptForNoise(trimmed);
  return NOISE_FRAGMENT_EXACT.has(normalized) || isFillerOnlyTranscript(trimmed);
}

export function isLowConfidenceShortTranscript(
  transcript: string,
  logprobs: number[] | null | undefined,
  options?: { maxWords?: number; threshold?: number },
): boolean {
  const maxWords = options?.maxWords ?? 2;
  const threshold = options?.threshold ?? DEFAULT_LOW_CONFIDENCE_LOGPROB_THRESHOLD;
  if (!logprobs?.length) return false;

  const wordCount = countTranscriptWords(transcript);
  if (wordCount > maxWords) return false;

  const avg = logprobs.reduce((sum, value) => sum + value, 0) / logprobs.length;
  return avg < threshold;
}

export function meetsLiveTranscriptSizeThreshold(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    countTranscriptWords(trimmed) >= DEFAULT_LIVE_TRANSCRIPT_MIN_WORDS ||
    trimmed.length >= DEFAULT_LIVE_TRANSCRIPT_MIN_CHARS
  );
}

export type LiveTranscriptGateState = {
  firstSeenAt: number;
  stableSinceAt: number;
  lastText: string;
};

export function createLiveTranscriptGateState(): LiveTranscriptGateState {
  return { firstSeenAt: 0, stableSinceAt: 0, lastText: "" };
}

export function resetLiveTranscriptGateState(state: LiveTranscriptGateState): void {
  state.firstSeenAt = 0;
  state.stableSinceAt = 0;
  state.lastText = "";
}

export function updateLiveTranscriptGateState(
  state: LiveTranscriptGateState,
  text: string,
  nowMs: number,
): void {
  const trimmed = text.trim();
  if (!trimmed) {
    resetLiveTranscriptGateState(state);
    return;
  }

  if (!state.firstSeenAt) {
    state.firstSeenAt = nowMs;
  }

  const normalized = normalizeTranscriptForNoise(trimmed);
  const lastNormalized = normalizeTranscriptForNoise(state.lastText);
  if (normalized !== lastNormalized) {
    state.stableSinceAt = nowMs;
    state.lastText = trimmed;
  } else if (!state.stableSinceAt) {
    state.stableSinceAt = nowMs;
    state.lastText = trimmed;
  }
}

export function shouldSurfaceLiveTranscript(
  text: string,
  state: LiveTranscriptGateState,
  nowMs: number,
  options?: {
    stableMs?: number;
    lastParkerTurnAtMs?: number;
  },
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const stableMs = options?.stableMs ?? DEFAULT_LIVE_TRANSCRIPT_STABLE_MS;
  const lastParkerTurnAtMs = options?.lastParkerTurnAtMs ?? 0;
  if (isProtectedShortTranscript(trimmed)) {
    if (
      requiresRecentParkerTurnForShortAnswer(trimmed) &&
      !hasRecentParkerTurn(lastParkerTurnAtMs, nowMs)
    ) {
      return false;
    }
    return true;
  }
  if (meetsLiveTranscriptSizeThreshold(trimmed)) return true;
  if (state.stableSinceAt > 0 && nowMs - state.stableSinceAt >= stableMs) {
    return true;
  }
  return false;
}

export function shouldIgnoreShortSpeechBurst(
  pendingTranscript: string,
  segmentDurationMs: number,
  minSpeechMs = DEFAULT_MIN_SPEECH_SEGMENT_MS,
  options?: { lastParkerTurnAtMs?: number; nowMs?: number },
): boolean {
  if (segmentDurationMs <= 0 || segmentDurationMs >= minSpeechMs) {
    return false;
  }
  const pending = pendingTranscript.trim();
  if (!pending) return true;
  const nowMs = options?.nowMs ?? Date.now();
  const lastParkerTurnAtMs = options?.lastParkerTurnAtMs ?? 0;
  if (isProtectedShortTranscript(pending)) {
    if (
      requiresRecentParkerTurnForShortAnswer(pending) &&
      !hasRecentParkerTurn(lastParkerTurnAtMs, nowMs)
    ) {
      return true;
    }
    return false;
  }
  return isRejectableNoiseFragment(pending);
}

export type TranscriptAcceptanceResult =
  | { accept: true; reason: "protected-short" | "substantive" | "command" }
  | {
      accept: false;
      reason:
        | "noise-fragment"
        | "filler"
        | "too-short"
        | "low-confidence"
        | "no-recent-parker-turn";
    };

function lacksRecentParkerTurnForShortAnswer(
  text: string,
  options?: TranscriptAcceptanceOptions,
): boolean {
  const nowMs = options?.nowMs ?? Date.now();
  const lastParkerTurnAtMs = options?.lastParkerTurnAtMs ?? 0;
  return (
    requiresRecentParkerTurnForShortAnswer(text) &&
    !hasRecentParkerTurn(lastParkerTurnAtMs, nowMs)
  );
}

export function evaluateTranscriptForAcceptance(
  text: string,
  thresholds: Pick<TranscriptCommitThresholds, "minWords" | "minChars">,
  options?: TranscriptAcceptanceOptions,
): TranscriptAcceptanceResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { accept: false, reason: "too-short" };
  }

  if (isProtectedShortTranscript(trimmed)) {
    if (lacksRecentParkerTurnForShortAnswer(trimmed, options)) {
      return { accept: false, reason: "no-recent-parker-turn" };
    }
    return { accept: true, reason: "protected-short" };
  }

  if (
    options?.logprobs &&
    isLowConfidenceShortTranscript(trimmed, options.logprobs)
  ) {
    return { accept: false, reason: "low-confidence" };
  }

  if (isRejectableNoiseFragment(trimmed)) {
    return { accept: false, reason: "noise-fragment" };
  }

  const fillerCheck = options?.isFillerOnly ?? isFillerOnlyTranscript;
  if (fillerCheck(trimmed)) {
    return { accept: false, reason: "filler" };
  }

  if (lacksRecentParkerTurnForShortAnswer(trimmed, options)) {
    return { accept: false, reason: "no-recent-parker-turn" };
  }

  if (
    countTranscriptWords(trimmed) >= thresholds.minWords &&
    trimmed.length >= thresholds.minChars
  ) {
    return { accept: true, reason: "substantive" };
  }

  return { accept: false, reason: "too-short" };
}

export function logNoiseFilterRejection(
  log: { info: (message: string) => void },
  text: string,
  result: Extract<TranscriptAcceptanceResult, { accept: false }>,
): void {
  const snippet = text.trim().slice(0, 80);
  if (result.reason === "low-confidence") {
    log.info(`[voice-noise-filter] rejected low-confidence fragment: "${snippet}"`);
    return;
  }
  if (result.reason === "noise-fragment" || result.reason === "filler") {
    log.info(`[voice-noise-filter] rejected short noise fragment: "${snippet}"`);
    return;
  }
  if (result.reason === "no-recent-parker-turn") {
    log.info(
      `[voice-noise-filter] rejected sub-3-word answer without recent Parker turn: "${snippet}"`,
    );
    return;
  }
  log.info(`[voice-noise-filter] rejected short fragment (${result.reason}): "${snippet}"`);
}

export function extractWhisperLogprobs(
  msg: Record<string, unknown>,
): number[] | undefined {
  const direct = msg.logprobs;
  if (Array.isArray(direct)) {
    return direct
      .map((entry) => {
        if (typeof entry === "number") return entry;
        if (entry && typeof entry === "object" && "logprob" in entry) {
          const value = (entry as { logprob?: unknown }).logprob;
          return typeof value === "number" ? value : Number.NaN;
        }
        return Number.NaN;
      })
      .filter((value) => Number.isFinite(value));
  }
  return undefined;
}
