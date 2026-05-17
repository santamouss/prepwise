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
