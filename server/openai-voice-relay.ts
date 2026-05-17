/**
 * Voice relay using OpenAI Realtime API (direct by default, Azure optional).
 *
 * Browser ←→ this relay ←→ OpenAI Realtime WebSocket
 *
 * Primary relay: server/voice-relay.ts (Volcengine S2S).
 * Run this as an alternative:  npm run dev:openai-voice
 */

import { randomUUID } from "crypto";
import { config } from "dotenv";
import { WebSocket, WebSocketServer } from "ws";
import { createLogger } from "../src/lib/logger";
import {
  type BigModelAsrConfig,
  BIGMODEL_ASR_URL,
  buildBigModelAudioRequest,
  buildBigModelFullRequest,
  buildBigModelHeaders,
  parseAsrResponse,
} from "./volcengine-asr";
import {
  applyPracticeModeToVoicePrompt,
  buildCoachModeInitialSystemGreeting,
} from "../src/lib/practice/coach-mode-prompt";
import {
  COACH_ANSWER_DONE_SYSTEM_PROMPT,
  COACH_ANSWER_REQUIRED_MESSAGE,
  COACH_RETRY_SYSTEM_PROMPT,
  isCoachNextPhrase,
  isCoachRetryPhrase,
} from "../src/lib/practice/coach-mode-ui";
import {
  buildRealtimeConversationCreateEvent,
  countTranscriptWords,
  DEFAULT_SPEECH_STARTED_RECENT_MS,
  DEFAULT_TTS_BARGE_IN_MIN_AUDIO_BYTES,
  DEFAULT_TTS_BARGE_IN_MIN_AUDIO_MS,
  isStrictFastPrevRequest,
  isSubstantiveTranscript,
  isWithinFragmentMergeWindow,
  type RealtimeMessageRole,
  readTranscriptCommitThresholds,
  readVoiceTranscriptTiming,
  shouldAllowTtsBargeIn,
  isAllowedMockResponseCreateReason,
  isClearNextQuestionCommand,
  isNoisyEmbeddedNextCommandCandidate,
  MOCK_ANSWER_COMPLETION_REASON,
  shouldBlockMockAutoResponse,
  shouldBlockMockTranscriptCommit,
  shouldBlockResponseCreateHard,
  shouldBlockVoiceResponseCreate,
  shouldDeferFlush,
  shouldDeferPreFlush,
  shouldSuppressEmptyResponseRetry,
} from "./openai-voice-relay-helpers";

const log = createLogger("openai-relay");

config({ path: ".env.local", override: true });
config({ path: ".env" });

// ── Configuration ───────────────────────────────────────────────────

const RELAY_PORT =
  Number(process.env.OPENAI_VOICE_RELAY_PORT || process.env.VOICE_RELAY_PORT) ||
  8767;
const OPENAI_REALTIME_TRANSCRIPTION_MODEL =
  process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "whisper-1";

const USE_AZURE_OPENAI_REALTIME =
  process.env.USE_AZURE_OPENAI_REALTIME === "true";

let OPENAI_WS_URL: string;
/** Upstream handshake headers — never logged. */
let OPENAI_REALTIME_WS_HEADERS: Record<string, string>;
let REALTIME_VOICE: string;
let REALTIME_MODEL_LABEL = "";
/** Short description only (no credential values). */
let REALTIME_AUTH_HEADER_SUMMARY = "";

const REALTIME_PROVIDER: "azure" | "openai" =
  USE_AZURE_OPENAI_REALTIME ? "azure" : "openai";

if (USE_AZURE_OPENAI_REALTIME) {
  const azureEndpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY || "";
  const azureDeployment =
    process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-realtime-1.5";

  if (!azureEndpoint || !azureApiKey) {
    log.error(
      "USE_AZURE_OPENAI_REALTIME=true but AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY is missing",
    );
    process.exit(1);
  }

  OPENAI_WS_URL = `${azureEndpoint}/openai/v1/realtime?model=${encodeURIComponent(azureDeployment)}`;
  OPENAI_REALTIME_WS_HEADERS = { "api-key": azureApiKey };
  REALTIME_VOICE = (process.env.AZURE_OPENAI_VOICE || "ash").toLowerCase();
  REALTIME_MODEL_LABEL = azureDeployment;
  REALTIME_AUTH_HEADER_SUMMARY = "Azure: api-key header only";
} else {
  const openAiKey =
    process.env.OPENAI_REALTIME_API_KEY || process.env.OPENAI_API_KEY || "";

  if (!openAiKey) {
    log.error(
      "Missing OpenAI API key: set OPENAI_REALTIME_API_KEY or OPENAI_API_KEY",
    );
    process.exit(1);
  }

  const wsBase = (
    process.env.OPENAI_REALTIME_WS_URL || "wss://api.openai.com/v1/realtime"
  ).replace(/\/+$/, "");
  const model =
    process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";

  OPENAI_WS_URL = `${wsBase}?model=${encodeURIComponent(model)}`;
  OPENAI_REALTIME_WS_HEADERS = {
    Authorization: `Bearer ${openAiKey}`,
  };
  REALTIME_VOICE = (
    process.env.OPENAI_REALTIME_VOICE || "alloy"
  ).toLowerCase();
  REALTIME_MODEL_LABEL = model;
  REALTIME_AUTH_HEADER_SUMMARY = "OpenAI direct: bearer (Authorization only)";
}

/**
 * Headers for upstream OpenAI / Azure Realtime WebSocket connections.
 */
function websocketHeadersForRealtimeUpstream(): Record<string, string> {
  if (USE_AZURE_OPENAI_REALTIME) {
    const key = OPENAI_REALTIME_WS_HEADERS["api-key"];
    if (!key) throw new Error("Azure realtime upstream: missing api-key");
    return { "api-key": key };
  }
  const bearer = OPENAI_REALTIME_WS_HEADERS.Authorization;
  if (!bearer) throw new Error("OpenAI direct realtime: missing Authorization");
  return {
    Authorization: bearer,
  };
}

const OPENAI_SESSION_CREATED_WAIT_MS = 20_000;

function waitForOpenAiSessionCreated(
  ws: WebSocket,
  context: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeListener("message", h);
      reject(new Error(`${context}: Session create timeout`));
    }, OPENAI_SESSION_CREATED_WAIT_MS);
    function h(data: Buffer) {
      try {
        const msg = JSON.parse(data.toString()) as {
          type?: string;
          error?: Record<string, unknown>;
          session?: Record<string, unknown>;
        };

        if (msg.type === "session.created") {
          clearTimeout(t);
          ws.removeListener("message", h);
          log.info(
            `${context}: session.created — default config keys:`,
            Object.keys(msg.session || {}),
          );
          resolve();
          return;
        }

        if (msg.type === "error") {
          clearTimeout(t);
          ws.removeListener("message", h);
          log.error(
            `${context}: session.created handshake — msg.type=error (full msg.error):`,
            JSON.stringify(msg.error ?? msg),
          );
          reject(
            new Error(
              `${context}: realtime error: ${JSON.stringify(msg.error ?? msg)}`,
            ),
          );
          return;
        }

        if (msg.type) {
          log.info(
            `${context}: waiting for session.created — upstream message type: ${msg.type}`,
          );
        }
      } catch {
        log.debug(`${context}: non-JSON upstream message during session.created wait`);
      }
    }
    ws.on("message", h);
  });
}

const OPENAI_SESSION_UPDATE_WAIT_MS = 20_000;

function waitForOpenAiSessionUpdated(
  ws: WebSocket,
  context: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeListener("message", h);
      reject(new Error(`${context}: Session update timeout`));
    }, OPENAI_SESSION_UPDATE_WAIT_MS);
    function h(data: Buffer) {
      try {
        const msg = JSON.parse(data.toString()) as {
          type?: string;
          error?: Record<string, unknown>;
          session?: Record<string, unknown>;
        };

        if (msg.type === "session.updated") {
          clearTimeout(t);
          ws.removeListener("message", h);
          const sess = msg.session as Record<string, unknown> | undefined;
          const audio =
            sess && typeof sess.audio === "object" && sess.audio !== null
              ? (sess.audio as Record<string, unknown>)
              : {};
          const audioIn =
            audio.input !== undefined &&
            typeof audio.input === "object" &&
            audio.input !== null
              ? (audio.input as Record<string, unknown>)
              : {};
          const turnDet = audioIn.turn_detection as
            | { type?: string }
            | undefined;
          log.info(
            `${context}: session.updated — transcription:`,
            JSON.stringify(audioIn.transcription),
            "turn_detection:",
            turnDet?.type,
            "noise_reduction:",
            JSON.stringify(audioIn.noise_reduction),
          );
          resolve();
          return;
        }

        if (msg.type === "error") {
          clearTimeout(t);
          ws.removeListener("message", h);
          log.error(
            `${context}: session.updated wait — msg.type=error (full msg.error):`,
            JSON.stringify(msg.error ?? msg),
          );
          reject(
            new Error(
              `${context}: session.update failed: ${JSON.stringify(msg.error ?? msg)}`,
            ),
          );
          return;
        }

        if (msg.type) {
          log.info(
            `${context}: waiting for session.updated — upstream message type: ${msg.type}`,
          );
        }
      } catch {
        log.debug(`${context}: non-JSON upstream message during session.updated wait`);
      }
    }
    ws.on("message", h);
  });
}

// ── Volcengine Big-Model streaming ASR config ───────────────────────
const VOLC_ASR_APPID = process.env.DOUBAO_APP_ID || "";
const VOLC_ASR_TOKEN = process.env.DOUBAO_ACCESS_TOKEN || "";
const VOLC_ASR_AVAILABLE = !!(VOLC_ASR_APPID && VOLC_ASR_TOKEN);
const ASR_PRIMARY = (process.env.VOICE_ASR_PRIMARY || "openai").toLowerCase();
const USE_VOLC_ASR_PRIMARY = VOLC_ASR_AVAILABLE && ASR_PRIMARY === "volc";
const USE_VOLC_ASR_INTERIMS = VOLC_ASR_AVAILABLE;

// Minimum RMS energy for user audio to be forwarded. 16-bit PCM silence is 0;
// typical speech is 500-5000. A threshold of 200 filters ambient noise while
// still capturing soft speech.
const MIN_AUDIO_RMS = 160;
const CONTINUATION_AUDIO_RMS = 100;
const TTS_BARGE_IN_RMS = 2400;
const TTS_BARGE_IN_FRAME_COUNT = 3;

// Whisper commonly hallucinates these phrases on silence / low-energy audio.
const WHISPER_HALLUCINATIONS = new Set([
  "thank you.", "thank you", "thanks.", "thanks",
  "thank you for watching.", "thanks for watching.",
  "bye.", "bye", "goodbye.", "goodbye",
  "you", "the end.", "subscribe.",
  ".", "..", "...", " ",
]);

function isWhisperHallucination(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return trimmed.length === 0 || WHISPER_HALLUCINATIONS.has(trimmed);
}

function looksLikeFarewell(text: string, isZh: boolean): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (/[?？]/.test(normalized)) return false;

  const zhPatterns = [
    /再见/,
    /保重/,
    /一路顺利/,
    /祝你(?:一切顺利|顺利|好运)/,
    /感谢你今天的参与/,
    /祝你未来(?:的)?面试顺利/,
  ];
  const enPatterns = [
    /\bgood\s*bye\b/,
    /\bgoodbye\b/,
    /\bbye for now\b/,
    /\bthat'?s all for now\b/,
    /\ball for now\b/,
    /\btake care\b/,
    /\bbest of luck\b/,
    /\bwish you (?:the )?best\b/,
    /\bthank you (?:so much )?for your time\b/,
    /\bfuture interviews\b/,
  ];

  const patterns = isZh ? [...zhPatterns, ...enPatterns] : [...enPatterns, ...zhPatterns];
  return patterns.some((pattern) => pattern.test(normalized));
}

function mergeAsrText(previous: string, incoming: string): string {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return prev;
  if (!prev) return next;

  const prevLower = prev.toLowerCase();
  const nextLower = next.toLowerCase();

  if (nextLower.includes(prevLower)) return next;
  if (prevLower.includes(nextLower)) return prev;

  // Avoid regressing a long interim transcript into a tiny trailing fragment.
  if (next.length + 8 < prev.length) return prev;

  return next.length >= prev.length ? next : prev;
}

const FAST_PREV_PATTERNS = [
  /^(?:上一个问题|上一题|previous\s*question)\.?$/i,
];

const USER_PREV_PATTERNS = [
  /(?:go|move|get)\s+back\s+(?:to\s+)?(?:the\s+)?(?:previous|last|prior)/i,
  /(?:return|go)\s+to\s+(?:the\s+)?(?:previous|last|prior)\s+(?:question|one|problem)/i,
  /(?:can|could)\s+(?:we|you|i)\s+(?:go|move|get)\s+back/i,
  /(?:let'?s|please|i\s+(?:want|need)\s+to)\s+(?:go|move|get)\s+back/i,
  /(?:revisit|re-visit)\s+(?:the\s+)?(?:previous|last|prior)/i,
  /previous\s+question/i,
  /(?:回到|返回|回去)(?:上一(?:个问题|题)|之前(?:的问题|那题))/,
  /(?:我(?:想|要|需要)|请|可以)(?:回到|返回|回去)上一/,
];

function isFastPrevRequest(text: string): boolean {
  const trimmed = text.trim();
  return FAST_PREV_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isUserPrevRequest(text: string): boolean {
  return USER_PREV_PATTERNS.some((pattern) => pattern.test(text));
}

const CODING_DONE_PATTERNS = [
  /\bi(?:'m| am)\s+done\b/i,
  /\bi\s+finished\b/i,
  /\bit'?s\s+done\b/i,
  /\bthat'?s\s+done\b/i,
  /\bfinished\s+it\b/i,
  /\bdone\s+with\s+(?:it|this|the code|the problem)\b/i,
];

function isCodingDoneSignal(text: string): boolean {
  return CODING_DONE_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

// ── Interview context type ───────────────────────────────────────────

interface InterviewContext {
  title: string;
  objective?: string | null;
  aiName: string;
  aiTone: string;
  language: string;
  followUpDepth: string;
  practiceMode?: "mock" | "coach";
  startQuestionIndex?: number;
  questions: Array<{
    text: string;
    type: string;
    description?: string | null;
    options?: { options: string[]; allowMultiple?: boolean } | null;
    starterCode?: { language: string; code: string } | null;
    order: number;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────

function isChineseInterview(ctx: InterviewContext): boolean {
  return ctx.language === "zh" || ctx.language.toLowerCase().includes("chinese");
}

/**
 * Resample 16kHz int16 PCM → 24kHz int16 PCM using linear interpolation.
 * OpenAI Realtime API only accepts 24kHz; browser captures at 16kHz.
 */
function resample16to24(input: Buffer): Buffer {
  const inputSamples = input.length / 2;
  const outputSamples = Math.floor((inputSamples * 3) / 2);
  const out = Buffer.alloc(outputSamples * 2);
  const ratio = inputSamples / outputSamples;

  for (let o = 0; o < outputSamples; o++) {
    const srcIdx = o * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, inputSamples - 1);
    const frac = srcIdx - idx0;
    const s0 = input.readInt16LE(idx0 * 2);
    const s1 = input.readInt16LE(idx1 * 2);
    const sample = Math.round(s0 + (s1 - s0) * frac);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), o * 2);
  }
  return out;
}

/** Convert int16 LE PCM → float32 LE PCM (browser expects float32 at 24kHz) */
function int16ToFloat32(buf: Buffer): Buffer {
  const samples = buf.length / 2;
  const out = Buffer.alloc(samples * 4);
  for (let i = 0; i < samples; i++) {
    out.writeFloatLE(buf.readInt16LE(i * 2) / 32768, i * 4);
  }
  return out;
}

function sendConversationTextMessage(
  ws: WebSocket,
  role: RealtimeMessageRole,
  text: string,
): void {
  ws.send(JSON.stringify(buildRealtimeConversationCreateEvent(role, text)));
}

function replayConversationHistory(
  ws: WebSocket,
  history: Array<{ role: "user" | "assistant"; text: string }>,
): { replayed: number; failed: number } {
  let replayed = 0;
  let failed = 0;
  for (const turn of history) {
    try {
      sendConversationTextMessage(ws, turn.role, turn.text);
      replayed += 1;
    } catch (err) {
      failed += 1;
      log.warn(
        `[reconnect] History replay failed for role=${turn.role}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return { replayed, failed };
}

// ── System prompt builder ───────────────────────────────────────────

function buildSystemPrompt(ctx: InterviewContext, startIdx: number): string {
  const isZh = isChineseInterview(ctx);
  const sorted = ctx.questions.sort((a, b) => a.order - b.order);

  let maxFollowUps: number;
  switch (ctx.followUpDepth) {
    case "LIGHT":    maxFollowUps = 1; break;
    case "MODERATE": maxFollowUps = 3; break;
    case "DEEP":     maxFollowUps = 5; break;
    default:         maxFollowUps = 2;
  }

  const questionList = sorted.map((q, i) => {
    let entry = `  ${i + 1}. [${q.type}] ${q.text}`;
    if (q.description) entry += `\n     Context: ${q.description}`;
    if (q.options?.options?.length) {
      const labels = q.options.options.map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`).join(", ");
      const multi = q.options.allowMultiple ? " (multiple choice)" : " (single choice)";
      entry += `\n     Options${multi}: ${labels}`;
    }
    if (q.type === "CODING") entry += `\n     Note: The participant has a code editor. You cannot see their code unless they describe it.`;
    if (q.type === "WHITEBOARD") entry += `\n     Note: The participant has a whiteboard. You will receive image updates silently — do NOT speak when you receive them. Only describe what you see when the participant asks you to look at it.`;
    return entry;
  }).join("\n");

  const currentQ = startIdx + 1;

  if (isZh) {
    return applyPracticeModeToVoicePrompt(`你是"${ctx.aiName}"，一位${ctx.aiTone}的AI面试官。

## 面试信息
- 主题: "${ctx.title}"
${ctx.objective ? `- 目标: ${ctx.objective}` : ""}
- 问题数量: ${sorted.length}
- 当前问题: 第${currentQ}个
- 每题追问深度: 最多${maxFollowUps}次追问

## 问题列表
${questionList}

## 你的行为准则
1. 从第${currentQ}个问题开始。先用温暖友好的方式自我介绍（提到你的名字、面试主题和问题数量）。然后说一句过渡语，比如"我们开始吧，这是第一个问题。"之后再提出问题。问候、过渡语和问题必须是三个独立的句子，不要合并。
2. 对每个问题，根据受访者的回答进行${maxFollowUps}次以内的追问。语气要像友好、耐心的真人面试官，而不是冷冰冰地连珠发问。
3. 当一个问题讨论充分后，调用 signal_question_change 函数来进入下一个问题。"讨论充分"是指受访者给出了详细、具体的回答——不是模糊的表述如"我遇到过很多挑战"。如果回答模糊，应追问以获取更多细节。
4. 切换后，自然地过渡到新问题。通常先用一句简短的认可或感谢来承接上一段回答，再进入下一题，而不是直接生硬地抛出问题。
5. 所有问题结束后，调用 signal_question_change 并设 questionIndex 为 ${sorted.length}（超出范围），然后做简短总结告别。
6. 保持对话自然流畅，回复简洁（1-3句话）。语速要平缓，略慢于日常对话，让受访者能轻松跟上。可以使用简短友好的衔接语，比如"谢谢你的分享"、"我明白了"、"这很有帮助"。
7. 如果受访者要求"跳过"或"下一题"，简短回应后立即调用 signal_question_change 并设 userRequested=true。
8. 如果受访者要求"上一题"，调用 signal_question_change 并设 questionIndex 为上一题的索引，设 userRequested=true。

## 选择题的特殊规则
当提问单选题或多选题时，你必须把所有选项（A、B、C等）逐一朗读出来作为问题的一部分。受访者只能听到你说话——如果你不说出选项，他们就无法知道有哪些选择。列出选项后，请受访者选择并解释理由。对于多选题，提醒他们可以选择多个选项。

## 编程题/白板题的特殊规则
当进入编程题或白板题时：
- 不要朗读完整的题目内容！题目详情已经显示在受访者的屏幕上。只需简短说明这是编程题/白板题，请他们查看屏幕上的题目并使用编辑器/白板。
- 回复要保持简短，让受访者专注于思考和编码/绘画。
- 受访者的发言分为以下几类，请对应回复：
  1. 向你提问或对话 → 正常回应
  2. 说"完成了"/"做好了" → 请他们解释思路、复杂度和可能的优化
  3. 自言自语或思考中 → 只用非常简短的鼓励（如"好的，继续"）
  4. 明确要跳过/放弃 → 简短鼓励后调用 signal_question_change
  5. 讨论已自然结束 → 简短感谢后调用 signal_question_change

## 语言要求
- 你必须始终用中文进行面试。你必须用中文回答。不要使用其他语言。

## 代码和白板可见性
- 你可以看到受访者的代码和白板内容！系统会通过 [CODE_UPDATE] 和 [WHITEBOARD_UPDATE] 消息将受访者编辑器中的代码和白板图片实时发送给你。
- 当受访者问你"能看到我的代码吗"或"看一下我写的"时，回答"是"并参考你收到的最新代码/白板内容。
- 不要在收到更新时主动开口——只在受访者和你说话时才提及。

## 重要规则
- 必须通过 signal_question_change 函数来切换问题。不要只口头说"让我们进入下一题"而不调用函数。
- 如果受访者只是简单打招呼、确认性问题或模糊回答（如"你好"、"能听到吗?"、"我遇到过很多挑战"），先友好回应，再继续当前问题；不要调用 signal_question_change。这些不是实质性回答。必须等受访者给出详细、具体的回答后再切换。如果回答太简短或模糊，应追问以获取更多信息。
- 始终关注当前问题，不要跳到其他话题。
- 对于选择题，确保受访者给出选择并解释理由。
- 当受访者让你看白板时，描述你看到的内容并给出反馈。不要在收到图片更新时自动开口说话。`, ctx.practiceMode);
  }

  return applyPracticeModeToVoicePrompt(`You are "${ctx.aiName}", a ${ctx.aiTone} AI interviewer.

## Interview Details
- Topic: "${ctx.title}"
${ctx.objective ? `- Objective: ${ctx.objective}` : ""}
- Total questions: ${sorted.length}
- Starting at: Question ${currentQ}
- Follow-up depth: Up to ${maxFollowUps} follow-ups per question

## Questions
${questionList}

## Your Behavior
1. Start at question ${currentQ}. First, give a warm greeting — introduce yourself by name, mention the topic "${ctx.title}" and that there are ${sorted.length} questions. Then say a transition phrase like "Let's get started. Here is the first question." ONLY AFTER that, ask the question. The greeting, the transition phrase, and the question MUST be three separate sentences — NEVER combine them into one.
2. For each question, follow up based on the participant's answers (up to ${maxFollowUps} follow-ups). Sound like a warm, patient human interviewer, not a rapid-fire questionnaire.
3. When a question is sufficiently discussed, call the signal_question_change function to move forward. "Sufficiently discussed" means the participant has given a detailed, specific answer — NOT a vague statement like "I had many challenges" or "that's a good question." If their answer is vague, ask them to elaborate before moving on.
4. After transitioning, naturally introduce the next question. Usually start with a short acknowledgement or appreciation of the participant's last answer before asking the next question.
5. After all questions are done, call signal_question_change with questionIndex=${sorted.length} (out of bounds), then give a brief wrap-up and farewell.
6. Keep responses concise (1-3 sentences) and conversational. Speak at a calm, unhurried pace — slightly slower than normal conversation speed so the participant can follow easily. Use brief friendly bridges like "Thanks for sharing that", "I appreciate the context", or "That makes sense" when appropriate.
7. If the participant asks to "skip" or "next question", briefly acknowledge and immediately call signal_question_change with userRequested=true.
8. If the participant asks for "previous question", call signal_question_change with the previous question's index and userRequested=true.

## Special Rules for Choice Questions
When asking a SINGLE_CHOICE or MULTIPLE_CHOICE question, you MUST read out ALL the answer options (A, B, C, etc.) as part of asking the question. The participant can only hear you — they cannot see the options unless you say them. After listing the options, ask the participant to choose and explain their reasoning. For multiple-choice questions, remind them they can select more than one option.

## Special Rules for Coding / Whiteboard Questions
When transitioning to a CODING or WHITEBOARD question:
- Do NOT read out the full question text! The question details are already displayed on the participant's screen. Just briefly say it's a coding/whiteboard question and ask them to read the problem on their screen and use the code editor/whiteboard.
- Keep your responses short — let the participant focus on thinking and coding/drawing.
- Categorize the participant's speech and respond accordingly:
  1. Talking TO YOU (asking questions, discussing approach) → Respond naturally
  2. Saying they're DONE ("I'm done", "finished") → Ask about their approach, time/space complexity, and possible improvements
  3. Thinking ALOUD (self-talk, "hmm", reading code) → Brief encouragement only (e.g. "Take your time")
  4. Wanting to SKIP ("I can't do this", "skip", "next question") → Brief encouragement, then call signal_question_change
  5. Discussion naturally CONCLUDED → Brief acknowledgement, then call signal_question_change

## Language Requirements
- YOU MUST ALWAYS RESPOND IN ENGLISH. You must conduct this interview entirely in English. Do not switch to any other language under any circumstance.

## Code and Whiteboard Visibility
- You CAN see the participant's code and whiteboard! The system sends you real-time updates via [CODE_UPDATE] and [WHITEBOARD_UPDATE] messages containing their editor code and whiteboard images.
- When the participant asks "can you see my code?" or "look at what I wrote", answer YES and reference the latest code/whiteboard content you received.
- Do NOT proactively speak when you receive an update — only reference the content when the participant addresses you.

## Important Rules
- You MUST use the signal_question_change function to transition between questions. NEVER verbally say "let's move on" without also calling the function — the UI only updates when the function is called.
- Do NOT call signal_question_change if the participant has only said a brief greeting, clarifying remark, or vague statement (e.g. "hi", "can you hear me?", "I had many challenges"). First respond warmly and helpfully, then continue the current question. These are NOT substantive answers. You MUST wait for a detailed, specific response that actually addresses the question before moving on. If their answer is too brief or vague, probe deeper.
- Stay focused on the current question. Do not jump to unrelated topics.
- For choice questions, ensure the participant both selects an option AND explains their reasoning.
- When the participant asks you to look at the whiteboard, describe what you see and give feedback. Do NOT automatically start speaking when you receive a whiteboard image update — wait for the participant to address you.`, ctx.practiceMode);
}

// ── OpenAI tool definitions ─────────────────────────────────────────

const OPENAI_TOOLS = [{
  type: "function" as const,
  name: "signal_question_change",
  description: "Signal that the interview should move to a different question. Call this ONLY when the current question has been substantively discussed (the participant gave a real, detailed answer — NOT a vague statement like 'I had many challenges'), or when the participant explicitly asks to skip/go back. Do NOT call this after a brief greeting or clarification like 'can you hear me'. After calling, naturally introduce the next question in your spoken response.",
  parameters: {
    type: "object",
    properties: {
      questionIndex: {
        type: "integer",
        description: "Zero-based index of the question to move to. Use current+1 for next, current-1 for previous, or total_questions to signal interview end.",
      },
      userRequested: {
        type: "boolean",
        description: "Set to true ONLY if the participant explicitly asked to skip, go to next/previous question, or go back. Set to false (or omit) when you are transitioning because the discussion is complete.",
      },
    },
    required: ["questionIndex"],
  },
}];

// ── Relay server ────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: RELAY_PORT });
log.info(`OpenAI voice relay listening on ws://localhost:${RELAY_PORT}`);
log.info(`Realtime provider: ${REALTIME_PROVIDER}`);
log.info(`Realtime model/deployment: ${REALTIME_MODEL_LABEL}`);
log.info(`Realtime voice: ${REALTIME_VOICE}`);
log.info(`Realtime upstream WebSocket URL (no secrets): ${OPENAI_WS_URL}`);
log.info(`Realtime upstream auth: ${REALTIME_AUTH_HEADER_SUMMARY}`);
log.info(
  `ASR: ${USE_VOLC_ASR_PRIMARY ? "Volcengine primary" : "OpenAI primary"}`
  + ` (OpenAI transcription model: ${OPENAI_REALTIME_TRANSCRIPTION_MODEL}; `
  + `${USE_VOLC_ASR_INTERIMS
    ? (USE_VOLC_ASR_PRIMARY ? "Volcengine primary" : "Volcengine interims enabled")
    : "Volcengine unavailable"})`
);

wss.on("connection", (browserWs) => {
  log.info("Browser connected, waiting for init...");

  const timeout = setTimeout(() => {
    log.error("No init message received within 10s");
    browserWs.close();
  }, 10000);

  const handler = (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "mic_test") {
        clearTimeout(timeout);
        browserWs.removeListener("message", handler);
        handleMicTest(browserWs);
      } else if (msg.type === "init" && msg.context) {
        clearTimeout(timeout);
        browserWs.removeListener("message", handler);
        handleInterview(browserWs, msg.context as InterviewContext);
      }
    } catch { /* not JSON */ }
  };
  browserWs.on("message", handler);
});

// ── Mic test handler ────────────────────────────────────────────────

async function handleMicTest(browserWs: WebSocket) {
  log.info(`Mic test mode (${USE_VOLC_ASR_PRIMARY ? "Volcengine" : "OpenAI"})`);

  let oaiWs: WebSocket | null = null;
  let volcWs: WebSocket | null = null;
  let volcAlive = false;
  let volcAudioSeq = 1;
  let volcKeepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const autoTimeout = setTimeout(() => {
    log.info("Mic test auto-timeout");
    if (browserWs.readyState === WebSocket.OPEN)
      browserWs.send(JSON.stringify({ type: "timeout" }));
    cleanup();
  }, 20_000);

  function cleanup() {
    clearTimeout(autoTimeout);
    if (volcKeepAliveTimer) { clearInterval(volcKeepAliveTimer); volcKeepAliveTimer = null; }
    if (volcWs && volcWs.readyState === WebSocket.OPEN) {
      try {
        volcAudioSeq++;
        volcWs.send(buildBigModelAudioRequest(Buffer.alloc(0), volcAudioSeq, true));
      } catch { /* ignore */ }
    }
    volcWs?.close();
    volcWs = null;
    volcAlive = false;
    oaiWs?.close();
    oaiWs = null;
  }

  async function connectMicTestVolcAsr() {
    const reqid = randomUUID().replace(/-/g, "");
    const asrConfig: BigModelAsrConfig = {
      format: "pcm", rate: 16000, bits: 16, channels: 1, codec: "raw",
      showUtterance: true, resultType: "single", enablePunc: true,
      endWindowSize: 500, forceToSpeechTime: 1000,
    };

    const wsHeaders = buildBigModelHeaders(VOLC_ASR_APPID, VOLC_ASR_TOKEN, reqid);
    volcWs = new WebSocket(BIGMODEL_ASR_URL, { headers: wsHeaders });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Volcengine ASR connect timeout")), 10_000);
      volcWs!.on("open", () => { clearTimeout(t); resolve(); });
      volcWs!.on("error", (e) => { clearTimeout(t); reject(e); });
    });

    let micAsrAccum = "";
    volcWs.on("message", (data: Buffer) => {
      try {
        const resp = parseAsrResponse(Buffer.from(data));
        if (resp.messageType === 0x0b) {
          if (!volcAlive) { volcAlive = true; log.info("Mic test Volcengine ASR connected"); }
          return;
        }
        if (resp.errorCode || (resp.code && resp.code !== 1000)) {
          log.warn(`Mic test Volc ASR error: code=${resp.code || resp.errorCode}`);
          return;
        }
        if (!volcAlive) return;

        if (resp.utterances?.length) {
          const utt = resp.utterances[0];
          if (utt.text) {
            micAsrAccum = utt.text;
            if (browserWs.readyState === WebSocket.OPEN) {
              browserWs.send(JSON.stringify({ type: "asr", data: { results: [{ text: micAsrAccum }] } }));
            }
          }
          if (utt.definite && micAsrAccum.trim()) {
            log.info(`Mic test ASR: ${JSON.stringify(micAsrAccum.trim())}`);
            if (browserWs.readyState === WebSocket.OPEN) {
              browserWs.send(JSON.stringify({ type: "asr_ended" }));
            }
            micAsrAccum = "";
          }
        } else if (resp.text) {
          micAsrAccum = resp.text;
          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(JSON.stringify({ type: "asr", data: { results: [{ text: micAsrAccum }] } }));
          }
          if (resp.isLastPackage && micAsrAccum.trim()) {
            log.info(`Mic test ASR final: ${JSON.stringify(micAsrAccum.trim())}`);
            if (browserWs.readyState === WebSocket.OPEN) {
              browserWs.send(JSON.stringify({ type: "asr_ended" }));
            }
            micAsrAccum = "";
          }
        }
      } catch (err) { log.error("Mic test Volc ASR parse error:", err); }
    });

    volcWs.send(buildBigModelFullRequest(asrConfig, reqid));
    volcAlive = true;

    volcWs.on("close", () => { volcAlive = false; });
    volcWs.on("error", (err: Error) => { log.error("Mic test Volc ASR error:", err.message); });

    volcKeepAliveTimer = setInterval(() => {
      if (!volcAlive || !volcWs || volcWs.readyState !== WebSocket.OPEN) return;
      volcAudioSeq++;
      volcWs.send(buildBigModelAudioRequest(Buffer.alloc(3200), volcAudioSeq));
    }, 5_000);
  }

  async function connectMicTestOpenAI() {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        oaiWs = new WebSocket(OPENAI_WS_URL, {
          headers: websocketHeadersForRealtimeUpstream(),
        });
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("OpenAI connect timeout")), 10_000);
          oaiWs!.on("open", () => { clearTimeout(t); resolve(); });
          oaiWs!.on("error", (e) => { clearTimeout(t); reject(e); });
        });
        break;
      } catch (err) {
        if (attempt < 2) {
          log.warn(`Mic test OpenAI connect attempt ${attempt} failed, retrying...`);
          oaiWs?.close(); oaiWs = null;
          await new Promise((r) => setTimeout(r, 1_000));
        } else { throw err; }
      }
    }

    await waitForOpenAiSessionCreated(oaiWs!, "mic test");

    oaiWs!.send(JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: "You are a mic test assistant. Listen to the user and confirm what you hear. Keep responses very short.",
        output_modalities: ["audio"],
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            noise_reduction: { type: "far_field" },
            transcription: { model: OPENAI_REALTIME_TRANSCRIPTION_MODEL },
            turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 300 },
          },
          output: { format: { type: "audio/pcm", rate: 24000 }, voice: REALTIME_VOICE },
        },
      },
    }));

    await waitForOpenAiSessionUpdated(oaiWs!, "mic test");

    let micTestAsrBuffer = "";
    oaiWs!.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          micTestAsrBuffer = msg.transcript || "";
          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(JSON.stringify({ type: "asr", data: { results: [{ text: micTestAsrBuffer.trim() }] } }));
          }
        }
        if (msg.type === "conversation.item.input_audio_transcription.delta") {
          micTestAsrBuffer += msg.delta || "";
          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(JSON.stringify({ type: "asr", data: { results: [{ text: micTestAsrBuffer.trim() }] } }));
          }
        }
        if (msg.type === "response.done") {
          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(JSON.stringify({ type: "asr_ended" }));
          }
          micTestAsrBuffer = "";
        }
      } catch { /* ignore */ }
    });

    oaiWs!.on("close", () => {
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(JSON.stringify({ type: "disconnected" }));
      }
    });
  }

  try {
    if (USE_VOLC_ASR_PRIMARY) {
      await connectMicTestVolcAsr();
    } else {
      await connectMicTestOpenAI();
    }

    browserWs.send(JSON.stringify({ type: "ready" }));

    // ── Audio relay ──
    browserWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type !== "audio" || !msg.data) return;
        const pcm16k = Buffer.from(msg.data, "hex");

        if (volcAlive && volcWs && volcWs.readyState === WebSocket.OPEN) {
          volcAudioSeq++;
          volcWs.send(buildBigModelAudioRequest(pcm16k, volcAudioSeq));
        }

        if (oaiWs && oaiWs.readyState === WebSocket.OPEN) {
          const pcm24k = resample16to24(pcm16k);
          oaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: pcm24k.toString("base64"),
          }));
        }
      } catch { /* ignore */ }
    });

    browserWs.on("close", () => {
      log.info("Mic test: browser disconnected");
      cleanup();
    });
  } catch (err) {
    log.error("Mic test failed:", err);
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({
        type: "error",
        message: `Mic test failed: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
    browserWs.close();
    cleanup();
  }
}

// ── Interview handler ───────────────────────────────────────────────

async function handleInterview(browserWs: WebSocket, ctx: InterviewContext) {
  const receivedPracticeMode = ctx.practiceMode ?? "unset";
  log.info(`[coach-mode] received practiceMode=${receivedPracticeMode}`);

  const sortedQuestions = ctx.questions.sort((a, b) => a.order - b.order);
  const isZh = isChineseInterview(ctx);
  let currentQuestionIndex = ctx.startQuestionIndex ?? 0;
  let questionEnteredAt = Date.now();
  const MIN_QUESTION_DWELL_MS = 15_000;
  const MIN_WORDS_BEFORE_TRANSITION = 20;
  let userCommittedWordsThisQuestion = 0;
  // Keep the transition tool available at all times. Server-side guards
  // still decide whether a transition request is actually allowed.
  let toolsEnabled = true;
  let interviewDone = false;
  let oaiWs: WebSocket | null = null;
  let oaiSessionStart = Date.now();
  let reconnecting = false;
  let browserClosed = false;

  let inputTranscriptBuffer = "";
  let outputTranscriptBuffer = "";
  let modelIsSpeaking = false;
  let lastOaiActivity = Date.now();
  let lastUserInput = 0;
  let lastMeaningfulUserInput = 0;
  let lastTranscriptCommittedAt = 0;
  let lastResponseRequestedAt = 0;
  let lastVadSpeechEnd = 0;
  let lastSpeechStartedAt = 0;
  let vadSpeechActive = false;
  let mockAutoResponseTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTtsAudioTime = 0; // when we last sent TTS audio to browser
  const TTS_ECHO_COOLDOWN_MS = 1500;
  let isTransitioning = false;
  let pendingInterviewComplete = false;
  let interviewCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  let emptyResponseRetries = 0;
  const MAX_EMPTY_RETRIES = 2;
  let responseTtsBytes = 0;
  let responseAudioStarted = false;
  let responseAudioStartedAt = 0;
  let pendingTtsText: string[] = [];
  let queuedAssistantResponse:
    | { reason: string; response?: Record<string, unknown> }
    | null = null;

  // Debounced user input flush
  const USER_INPUT_FLUSH_MS = 3000;
  let pendingInputFlush: ReturnType<typeof setTimeout> | null = null;
  let pendingAsrUpdate: ReturnType<typeof setTimeout> | null = null;

  // Track pending function calls that need responses
  let pendingFunctionCalls: Array<{ callId: string; name: string; args: string }> = [];

  function getVoicePipelineBlockInput(now = Date.now()) {
    const pending = bestAvailableTranscript();
    return {
      userSpeaking: vadSpeechActive,
      lastSpeechStartedAt,
      lastSpeechStoppedAt: lastVadSpeechEnd,
      nowMs: now,
      hasPendingTranscript: !!pending && !speechTranscriptCommitted,
      transcriptStabilizing: !!pending && !transcriptLooksStable(now),
    };
  }

  function isExemptFromUserSpeechBlock(reason: string): boolean {
    if (ctx.practiceMode === "coach" && reason.startsWith("coach ")) {
      return true;
    }
    return (
      reason.startsWith("question prompt") ||
      reason === "initial greeting" ||
      reason === "greeting retry" ||
      reason === "function call follow-up" ||
      reason === "system say-aloud" ||
      reason === "text input" ||
      reason.startsWith("queued after ")
    );
  }

  function deferMockAnswerCompletionFromFlush() {
    if (ctx.practiceMode === "coach") return;
    if (bestAvailableTranscript()) {
      scheduleMockAnswerCompletion("flush deferred");
    }
  }

  function flushUserInput() {
    if (pendingInputFlush) { clearTimeout(pendingInputFlush); pendingInputFlush = null; }

    if (ctx.practiceMode !== "coach") {
      if (vadSpeechActive) {
        log.info("[voice-pipeline] flush deferred because userSpeaking=true");
      }
      deferMockAnswerCompletionFromFlush();
      return;
    }

    const now = Date.now();
    if (shouldDeferFlush({ ...getVoicePipelineBlockInput(now), userSpeaking: vadSpeechActive })) {
      if (vadSpeechActive) {
        log.info("[voice-pipeline] flush deferred because userSpeaking=true");
      }
      return;
    }
    const committedText = commitUserTranscript("flush");
    if (committedText) {
      handleCommittedUserText(committedText, "flush");
    }
  }

  function scheduleInputFlush() {
    if (ctx.practiceMode !== "coach") return;
    if (vadSpeechActive) return;
    if (pendingInputFlush) clearTimeout(pendingInputFlush);
    pendingInputFlush = setTimeout(() => {
      pendingInputFlush = null;
      flushUserInput();
    }, USER_INPUT_FLUSH_MS);
  }

  let latestCode = "";
  let latestCodeLanguage = "plaintext";
  let openAiTranscriptionEnabled = true;
  let pendingSpeechFinalize: ReturnType<typeof setTimeout> | null = null;
  let speechTranscriptCommitted = false;
  let responseInFlight = false;

  let pendingQuestionPrompt: string | null = null;
  let pendingPromptTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTranscriptUpdateAt = 0;
  let pendingTurnAnchorAt = 0;
  let lastPendingFragmentUpdateAt = 0;
  const transcriptThresholds = readTranscriptCommitThresholds(
    process.env,
    ctx.practiceMode,
  );
  const voiceTiming = readVoiceTranscriptTiming(ctx.practiceMode);
  const USER_TRANSCRIPT_STABILITY_MS = voiceTiming.transcriptStabilityMs;
  const USER_TRANSCRIPT_MAX_WAIT_MS = voiceTiming.transcriptMaxWaitMs;
  const USER_SPEECH_STOP_FINALIZE_MS = voiceTiming.speechStopFinalizeMs;
  const SPEECH_STOP_FORWARD_GRACE_MS = 1400;
  const STALE_ASR_GUARD_MS = 1500;
  let staleAsrGuardText = "";
  let staleAsrGuardUntil = 0;
  let speechStopForwardGraceUntil = 0;
  let ttsBargeInFrames = 0;

  const conversationHistory: Array<{ role: "user" | "assistant"; text: string }> = [];
  const MAX_HISTORY_ENTRIES = 30;

  function pushHistory(role: "user" | "assistant", text: string) {
    if (!text.trim()) return;
    if (role === "user" && !text.startsWith("[")) {
      userCommittedWordsThisQuestion += text.trim().split(/\s+/).length;
      if (!toolsEnabled && userCommittedWordsThisQuestion >= MIN_WORDS_BEFORE_TRANSITION) {
        enableTools();
      }
    }
    conversationHistory.push({ role, text: text.trim() });
    while (conversationHistory.length > MAX_HISTORY_ENTRIES) {
      conversationHistory.shift();
    }
  }

  function enableTools() {
    if (toolsEnabled || !oaiWs || oaiWs.readyState !== WebSocket.OPEN) return;
    toolsEnabled = true;
    oaiWs.send(JSON.stringify({
      type: "session.update",
      session: { type: "realtime", tool_choice: "auto" },
    }));
    log.info("Tools enabled (word threshold reached)");
  }

  function disableTools() {
    // Intentionally keep tools enabled across questions. Explicit user
    // navigation requests can arrive before the participant gives a
    // substantive answer, and those should still be able to transition.
  }

  let pendingTransitionTimer: ReturnType<typeof setTimeout> | null = null;

  log.info(`Interview: "${ctx.title}" (${sortedQuestions.length} questions, lang=${ctx.language}, startQ=${currentQuestionIndex})`);

  function send(msg: Record<string, unknown>) {
    if (browserWs.readyState === WebSocket.OPEN)
      browserWs.send(JSON.stringify(msg));
  }

  function sendBinary(buf: Buffer) {
    if (browserWs.readyState === WebSocket.OPEN)
      browserWs.send(buf, { binary: true });
  }

  function clearPendingTransition() {
    if (pendingTransitionTimer) {
      clearTimeout(pendingTransitionTimer);
      pendingTransitionTimer = null;
    }
  }

  function noteMeaningfulUserActivity(reason: string) {
    const now = Date.now();
    lastMeaningfulUserInput = now;
    lastUserInput = now;
    log.info(`[voice-pipeline] Meaningful user activity (${reason})`);
  }

  function sendQuestionPrompt(prompt: string, retriesLeft = 2) {
    pendingQuestionPrompt = prompt;
    if (pendingPromptTimer) clearTimeout(pendingPromptTimer);

    if (oaiWs?.readyState === WebSocket.OPEN && !reconnecting) {
      sendConversationTextMessage(oaiWs, "system", prompt);
      requestAssistantResponse("question prompt");
    }

    pendingPromptTimer = setTimeout(() => {
      if (!pendingQuestionPrompt) return;
      if (retriesLeft > 0 && !browserClosed && !interviewDone) {
        log.warn(`No OpenAI response to question prompt — retrying (${retriesLeft} left)`);
        sendQuestionPrompt(prompt, retriesLeft - 1);
      } else {
        log.warn("OpenAI did not respond to question prompt after retries");
        pendingQuestionPrompt = null;
      }
    }, 5_000);
  }

  function clearQuestionPrompt() {
    pendingQuestionPrompt = null;
    if (pendingPromptTimer) {
      clearTimeout(pendingPromptTimer);
      pendingPromptTimer = null;
    }
  }

  function cancelOngoingResponse() {
    const shouldCancel =
      responseInFlight ||
      responseAudioStarted ||
      modelIsSpeaking ||
      !!outputTranscriptBuffer;
    if (shouldCancel && oaiWs && oaiWs.readyState === WebSocket.OPEN) {
      responseInFlight = false;
      oaiWs.send(JSON.stringify({ type: "response.cancel" }));
    }
    outputTranscriptBuffer = "";
    pendingTtsText = [];
    responseTtsBytes = 0;
    responseAudioStarted = false;
    responseAudioStartedAt = 0;
    modelIsSpeaking = false;
  }

  function logVoicePipelineState(context: string) {
    const pending = bestAvailableTranscript();
    log.info(
      `[voice-pipeline] ${context} userSpeaking=${vadSpeechActive} lastSpeechStartedAt=${lastSpeechStartedAt || "none"} lastSpeechStoppedAt=${lastVadSpeechEnd || "none"} pendingTranscript words=${countTranscriptWords(pending)} chars=${pending.length}`,
    );
  }

  function skipAssistantResponse(reason: string) {
    log.info(`[voice-pipeline] skipped response.create (${reason})`);
    logVoicePipelineState("skip");
  }

  function requestAssistantResponse(reason: string, response?: Record<string, unknown>) {
    if (
      !oaiWs ||
      oaiWs.readyState !== WebSocket.OPEN ||
      reconnecting ||
      isTransitioning ||
      (interviewDone && !pendingInterviewComplete)
    ) {
      skipAssistantResponse(`${reason}: session not ready`);
      return;
    }
    if (!isExemptFromUserSpeechBlock(reason)) {
      const blockInput = getVoicePipelineBlockInput();
      const hardBlock = shouldBlockResponseCreateHard(blockInput);
      if (hardBlock.block) {
        log.info(
          `[voice-pipeline] response.create blocked: ${hardBlock.reason} reason=${reason}`,
        );
        logVoicePipelineState(`blocked (${reason})`);
        deferMockAnswerCompletionFromFlush();
        return;
      }

      if (
        ctx.practiceMode !== "coach" &&
        !isAllowedMockResponseCreateReason(reason)
      ) {
        log.info(
          `[voice-pipeline] response.create blocked: mock requires timer reason=${reason}`,
        );
        logVoicePipelineState(`blocked (${reason})`);
        deferMockAnswerCompletionFromFlush();
        return;
      }

      const block = shouldBlockVoiceResponseCreate(blockInput);
      if (block.block) {
        log.info(
          `[voice-pipeline] response.create blocked: ${block.reason} reason=${reason}`,
        );
        logVoicePipelineState(`blocked (${reason})`);
        deferMockAnswerCompletionFromFlush();
        return;
      }
    }
    if (responseInFlight) {
      queuedAssistantResponse = { reason, response };
      log.info(`Queued assistant response (${reason}) while another response is active`);
      return;
    }
    const payload = response
      ? { type: "response.create", response }
      : { type: "response.create" };
    responseInFlight = true;
    lastResponseRequestedAt = Date.now();
    oaiWs.send(JSON.stringify(payload));
    log.info(`[voice-pipeline] response.create requested (${reason})`);
    logVoicePipelineState(reason);
  }

  function takeQueuedAssistantResponse() {
    const next = queuedAssistantResponse;
    queuedAssistantResponse = null;
    return next;
  }

  function normalizeAsrGuardText(text: string): string {
    return text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function shouldIgnoreStaleAsrText(text: string): boolean {
    if (!staleAsrGuardText || Date.now() > staleAsrGuardUntil) return false;
    const incoming = normalizeAsrGuardText(text);
    const previous = normalizeAsrGuardText(staleAsrGuardText);
    if (!incoming || !previous) return false;
    if (incoming === previous) return true;
    if (incoming.length >= 8 && previous.includes(incoming)) return true;
    if (previous.length >= 8 && incoming.includes(previous)) return true;
    return false;
  }

  function armStaleAsrGuard(text: string) {
    staleAsrGuardText = text;
    staleAsrGuardUntil = Date.now() + STALE_ASR_GUARD_MS;
  }

  function clearStaleAsrGuard() {
    staleAsrGuardText = "";
    staleAsrGuardUntil = 0;
  }

  function markPendingTurnActivity(now = Date.now()) {
    if (!pendingTurnAnchorAt) {
      pendingTurnAnchorAt = now;
    }
    lastPendingFragmentUpdateAt = now;
  }

  function resetPendingTurnActivity() {
    pendingTurnAnchorAt = 0;
    lastPendingFragmentUpdateAt = 0;
  }

  function pendingFragmentWithinMergeWindow(now = Date.now()): boolean {
    const anchor = pendingTurnAnchorAt || lastPendingFragmentUpdateAt;
    return isWithinFragmentMergeWindow(
      now,
      anchor,
      transcriptThresholds.fragmentMergeMs,
    );
  }

  function lastCommittedUserAnswerText(): string {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const entry = conversationHistory[i];
      if (entry.role === "user" && !entry.text.startsWith("[")) {
        return entry.text;
      }
    }
    return "";
  }

  function resetCoachAnswerBuffers() {
    speechTranscriptCommitted = false;
    inputTranscriptBuffer = "";
    volcAsrAccumulator = "";
    lastTranscriptUpdateAt = 0;
    resetPendingTurnActivity();
    clearStaleAsrGuard();
  }

  function handleCoachAnswerDone() {
    let answerText = bestAvailableTranscript();
    if (!answerText && speechTranscriptCommitted) {
      answerText = lastCommittedUserAnswerText();
    }
    if (!answerText || !isSubstantiveTranscript(answerText, transcriptThresholds)) {
      send({ type: "coach_control_error", message: COACH_ANSWER_REQUIRED_MESSAGE });
      return;
    }

    if (!speechTranscriptCommitted) {
      finalizeUserTurn("coach answer done", false);
    }

    sendConversationTextMessage(oaiWs!, "system", COACH_ANSWER_DONE_SYSTEM_PROMPT);
    requestAssistantResponse("coach answer done");
    log.info("[coach-mode] coach_answer_done — coaching requested");
  }

  function handleCoachRetryQuestion(source: string) {
    resetCoachAnswerBuffers();
    sendConversationTextMessage(oaiWs!, "system", COACH_RETRY_SYSTEM_PROMPT);
    requestAssistantResponse(`coach retry (${source})`);
    log.info(`[coach-mode] coach_retry_question (${source})`);
  }

  function tryHandlePendingNavigationCommand(pending: string): boolean {
    const command = isClearNextQuestionCommand(pending);
    if (!command.detected) {
      if (isNoisyEmbeddedNextCommandCandidate(pending)) {
        log.info("[voice-command] ignored noisy next command candidate");
      }
      return false;
    }

    log.info(`[voice-command] next command detected: ${command.commandPhrase}`);
    if (!speechTranscriptCommitted) {
      commitUserTranscript("voice command");
    }
    if (tryHandleExplicitUserNavigation(pending)) {
      log.info("[voice-command] advancing to next question from short command");
      clearMockAutoResponseTimer("navigation command");
      return true;
    }
    return false;
  }

  function handleCommittedUserText(committedText: string, reason: string): boolean {
    if (tryHandleExplicitUserNavigation(committedText)) {
      return true;
    }
    if (ctx.practiceMode === "coach" && reason !== "coach answer done") {
      log.info("[coach-mode] substantive answer buffered; waiting for I'm done answering");
      return false;
    }
    const currentQuestion = sortedQuestions[currentQuestionIndex];
    if (
      currentQuestion &&
      (currentQuestion.type === "CODING" || currentQuestion.type === "WHITEBOARD") &&
      isCodingDoneSignal(committedText) &&
      oaiWs &&
      oaiWs.readyState === WebSocket.OPEN
    ) {
      sendConversationTextMessage(
        oaiWs,
        "system",
        "[SYSTEM] The participant just said they are done with the coding/whiteboard task. Do NOT stay silent. Acknowledge briefly, then ask them to walk through their solution, including key tradeoffs and complexity.",
      );
    }
    if (
      ctx.practiceMode !== "coach" &&
      !isAllowedMockResponseCreateReason(reason)
    ) {
      log.info(
        `[voice-pipeline] mock committed text ignored for response (${reason})`,
      );
      return false;
    }
    requestAssistantResponse(reason);
    return false;
  }

  function clearSpeechFinalizeTimer(reason?: string) {
    if (pendingSpeechFinalize) {
      clearTimeout(pendingSpeechFinalize);
      pendingSpeechFinalize = null;
      if (reason && ctx.practiceMode === "coach") {
        log.info(`[voice-pipeline] coach speech finalize timer cancelled (${reason})`);
      }
    }
  }

  function clearMockAutoResponseTimer(reason?: string) {
    if (mockAutoResponseTimer) {
      clearTimeout(mockAutoResponseTimer);
      mockAutoResponseTimer = null;
      if (reason) {
        log.info(`[voice-pipeline] mock auto-response timer cancelled (${reason})`);
      }
    }
  }

  function scheduleMockAnswerCompletion(reason: string, delayMs = USER_SPEECH_STOP_FINALIZE_MS) {
    if (ctx.practiceMode === "coach") return;
    clearMockAutoResponseTimer();
    log.info(
      `[voice-pipeline] mock auto-response timer scheduled (${reason}, ${delayMs}ms)`,
    );
    mockAutoResponseTimer = setTimeout(() => {
      mockAutoResponseTimer = null;
      const now = Date.now();
      const pending = bestAvailableTranscript();
      if (speechTranscriptCommitted || !pending) return;

      const blockInput = {
        userSpeaking: vadSpeechActive,
        lastSpeechStartedAt,
        lastSpeechStoppedAt: lastVadSpeechEnd,
        nowMs: now,
        transcriptStabilizing: !transcriptLooksStable(now),
      };

      const block = shouldBlockMockAutoResponse(blockInput);
      if (block.block) {
        log.info(
          `[voice-pipeline] mock auto-response timer deferred because ${block.reason}`,
        );
        scheduleMockAnswerCompletion(
          `${reason} deferred`,
          DEFAULT_SPEECH_STARTED_RECENT_MS,
        );
        return;
      }

      if (tryHandlePendingNavigationCommand(pending)) {
        return;
      }

      log.info(
        `[voice-pipeline] mock timer fired with userSpeaking=false (${MOCK_ANSWER_COMPLETION_REASON})`,
      );
      logVoicePipelineState(`mock auto-response fired (${MOCK_ANSWER_COMPLETION_REASON})`);
      finalizeUserTurn(MOCK_ANSWER_COMPLETION_REASON);
    }, delayMs);
  }

  function bestAvailableTranscript(): string {
    return mergeAsrText(inputTranscriptBuffer, volcAsrAccumulator).trim();
  }

  function noteTranscriptUpdate() {
    const now = Date.now();
    lastTranscriptUpdateAt = now;
    const pending = bestAvailableTranscript();
    if (pending) {
      if (
        pendingTurnAnchorAt > 0 &&
        isWithinFragmentMergeWindow(
          now,
          lastPendingFragmentUpdateAt || pendingTurnAnchorAt,
          transcriptThresholds.fragmentMergeMs,
        )
      ) {
        log.info("[voice-pipeline] merged user transcript fragment");
      }
      markPendingTurnActivity(now);
    }
    if (!vadSpeechActive && !speechTranscriptCommitted && pending) {
      if (ctx.practiceMode === "coach") {
        scheduleSpeechFinalize("asr stability", USER_TRANSCRIPT_STABILITY_MS);
      } else {
        scheduleMockAnswerCompletion("asr stability", USER_TRANSCRIPT_STABILITY_MS);
      }
    }
  }

  function transcriptLooksStable(now = Date.now()): boolean {
    if (!lastTranscriptUpdateAt) return true;
    const sinceUpdate = now - lastTranscriptUpdateAt;
    const sinceSpeechStop = lastVadSpeechEnd ? now - lastVadSpeechEnd : Number.POSITIVE_INFINITY;
    return sinceUpdate >= USER_TRANSCRIPT_STABILITY_MS || sinceSpeechStop >= USER_TRANSCRIPT_MAX_WAIT_MS;
  }

  function commitUserTranscript(reason: string): string {
    clearSpeechFinalizeTimer();
    if (speechTranscriptCommitted) return "";

    const blockInput = getVoicePipelineBlockInput();
    if (ctx.practiceMode !== "coach") {
      if (shouldBlockMockTranscriptCommit(reason, blockInput)) {
        if (vadSpeechActive && (reason === "flush" || reason === "response pre-flush")) {
          log.info(`[voice-pipeline] commit deferred (${reason}) because userSpeaking=true`);
        }
        deferMockAnswerCompletionFromFlush();
        return "";
      }
    } else if (
      (reason === "flush" || reason === "response pre-flush") &&
      shouldDeferFlush({ ...blockInput, userSpeaking: vadSpeechActive })
    ) {
      if (vadSpeechActive) {
        log.info(`[voice-pipeline] commit deferred (${reason}) because userSpeaking=true`);
      }
      return "";
    }

    const committedText = bestAvailableTranscript();
    if (!committedText) return "";

    if (
      !isSubstantiveTranscript(committedText, transcriptThresholds) &&
      reason !== "voice command"
    ) {
      log.info("[voice-pipeline] pending fragment too short; buffering");
      return "";
    }

    speechTranscriptCommitted = true;
    lastTranscriptCommittedAt = Date.now();
    noteMeaningfulUserActivity(`transcript committed (${reason})`);
    pushHistory("user", committedText);
    send({ type: "asr_ended", text: committedText });
    log.info(`[voice-pipeline] committed substantive user answer (${reason})`);
    inputTranscriptBuffer = "";
    volcAsrAccumulator = "";
    lastTranscriptUpdateAt = 0;
    resetPendingTurnActivity();
    armStaleAsrGuard(committedText);
    return committedText;
  }

  function scheduleSpeechFinalize(reason: string, delayMs = 2000) {
    clearSpeechFinalizeTimer();
    pendingSpeechFinalize = setTimeout(() => {
      pendingSpeechFinalize = null;
      if (speechTranscriptCommitted || !bestAvailableTranscript()) return;
      if (!transcriptLooksStable()) {
        const now = Date.now();
        const waitForStability = Math.max(
          150,
          USER_TRANSCRIPT_STABILITY_MS - (now - lastTranscriptUpdateAt),
        );
        const waitForCap = lastVadSpeechEnd
          ? Math.max(150, USER_TRANSCRIPT_MAX_WAIT_MS - (now - lastVadSpeechEnd))
          : USER_TRANSCRIPT_STABILITY_MS;
        scheduleSpeechFinalize(reason, Math.min(waitForStability, waitForCap));
        return;
      }
      finalizeUserTurn(reason);
    }, delayMs);
  }

  function finalizeUserTurn(reason: string, requestResponse?: boolean): string {
    const wantsResponse =
      requestResponse ?? (ctx.practiceMode !== "coach");
    const pending = bestAvailableTranscript();
    if (pending && tryHandlePendingNavigationCommand(pending)) {
      return "";
    }
    if (pending && !isSubstantiveTranscript(pending, transcriptThresholds)) {
      if (wantsResponse) {
        log.info("[voice-pipeline] response.create skipped for short fragment");
      }
      return "";
    }

    if (ctx.practiceMode !== "coach") {
      if (reason !== MOCK_ANSWER_COMPLETION_REASON) {
        scheduleMockAnswerCompletion(`${reason} deferred`);
        return "";
      }
      const block = shouldBlockMockAutoResponse(getVoicePipelineBlockInput());
      if (block.block) {
        log.info(`[voice-pipeline] finalize deferred (${reason}) because ${block.reason}`);
        scheduleMockAnswerCompletion(`${reason} deferred`);
        return "";
      }
    }

    const committed = commitUserTranscript(reason);
    if (committed && wantsResponse) {
      handleCommittedUserText(committed, reason);
    }
    return committed;
  }

  function tryAcceptFreshAsrText(text: string, label: string): boolean {
    if (speechTranscriptCommitted) return false;
    if (!inputTranscriptBuffer && !volcAsrAccumulator && shouldIgnoreStaleAsrText(text)) {
      log.debug(`Ignored stale ${label}: ${JSON.stringify(text)}`);
      return false;
    }
    clearStaleAsrGuard();
    return true;
  }

  function emitInterimUserTranscript(text: string, allowWhenVolcSilent = false) {
    if (allowWhenVolcSilent && volcAsrAccumulator.trim()) return;
    send({ type: "asr", data: { results: [{ text }] } });
  }

  function handleVolcInterimText(text: string, label: string) {
    if (!tryAcceptFreshAsrText(text, label)) return;
    volcAsrAccumulator = mergeAsrText(volcAsrAccumulator, text);
    noteTranscriptUpdate();
    emitInterimUserTranscript(volcAsrAccumulator);
  }

  function handleVolcFinalText(reason: string, logLabel: string) {
    const userText = bestAvailableTranscript();
    if (userText && !volcAsrPreFlushed) {
      if (USE_VOLC_ASR_PRIMARY) {
        log.info(`${logLabel}: ${JSON.stringify(userText)}`);
        if (ctx.practiceMode !== "coach") {
          scheduleMockAnswerCompletion(reason);
        } else {
          finalizeUserTurn(reason);
        }
      } else {
        log.debug(`${logLabel} (interim-only): ${JSON.stringify(userText)}`);
        noteTranscriptUpdate();
        emitInterimUserTranscript(userText);
      }
    } else if (userText) {
      log.debug(`${logLabel} (skipped${volcAsrPreFlushed ? ", pre-flushed" : ""}${speechTranscriptCommitted ? ", committed" : ""}): ${JSON.stringify(userText)}`);
    }
    volcAsrPreFlushed = false;
  }

  function handleWhisperDelta(delta: string) {
    if (!delta || !tryAcceptFreshAsrText(delta, "Whisper delta")) return;
    inputTranscriptBuffer += delta;
    noteTranscriptUpdate();
    if (pendingAsrUpdate) clearTimeout(pendingAsrUpdate);
    pendingAsrUpdate = setTimeout(() => {
      pendingAsrUpdate = null;
      emitInterimUserTranscript(inputTranscriptBuffer, true);
    }, 150);
    if (pendingInputFlush) scheduleInputFlush();
  }

  function handleWhisperCompletedTranscript(transcript: string) {
    if (!transcript || !tryAcceptFreshAsrText(transcript, "Whisper completion")) return;

    const msSinceVadSpeech = Date.now() - lastVadSpeechEnd;
    if (isWhisperHallucination(transcript) || (msSinceVadSpeech > 10_000 && transcript.trim().split(/\s+/).length <= 6)) {
      log.debug(`ASR dropped (hallucination, ${msSinceVadSpeech}ms since VAD): ${JSON.stringify(transcript)}`);
      return;
    }

    log.info("[voice-pipeline] ASR completed");
    inputTranscriptBuffer = mergeAsrText(inputTranscriptBuffer, transcript);
    noteTranscriptUpdate();
    if (pendingAsrUpdate) clearTimeout(pendingAsrUpdate);
    pendingAsrUpdate = null;
    emitInterimUserTranscript(inputTranscriptBuffer, true);
    scheduleInputFlush();
  }

  function handleSpeechStartedEvent() {
    noteMeaningfulUserActivity("speech_started");
    lastSpeechStartedAt = Date.now();
    log.info("[voice-pipeline] speech_started");
    logVoicePipelineState("speech_started");
    speechStopForwardGraceUntil = 0;
    queuedAssistantResponse = null;

    const pending = bestAvailableTranscript();
    if (pending && !speechTranscriptCommitted) {
      if (!isSubstantiveTranscript(pending, transcriptThresholds)) {
        log.info("[voice-pipeline] pending fragment too short; buffering");
      } else if (pendingFragmentWithinMergeWindow()) {
        log.info("[voice-pipeline] speech restart within merge window; keeping buffered answer");
      }
    }

    cancelOngoingResponse();
    clearSpeechFinalizeTimer("speech_started");
    clearMockAutoResponseTimer("speech_started");
    if (pendingInputFlush) {
      clearTimeout(pendingInputFlush);
      pendingInputFlush = null;
    }
    vadSpeechActive = true;
    if (speechTranscriptCommitted) {
      speechTranscriptCommitted = false;
      volcAsrAccumulator = "";
      inputTranscriptBuffer = "";
      resetPendingTurnActivity();
    } else if (pending) {
      markPendingTurnActivity();
    }
    send({ type: "interrupt" });
  }

  function handleSpeechStoppedEvent() {
    vadSpeechActive = false;
    lastVadSpeechEnd = Date.now();
    speechStopForwardGraceUntil = lastVadSpeechEnd + SPEECH_STOP_FORWARD_GRACE_MS;
    log.info("[voice-pipeline] speech_stopped");
    logVoicePipelineState("speech_stopped");
    if (!speechTranscriptCommitted && bestAvailableTranscript()) {
      if (ctx.practiceMode === "coach") {
        scheduleSpeechFinalize("speech stop", USER_SPEECH_STOP_FINALIZE_MS);
      } else {
        scheduleMockAnswerCompletion("speech stop");
      }
    }
  }

  function flushPendingUserTurnBeforeAssistant() {
    if (ctx.practiceMode !== "coach") {
      const pendingUserText = bestAvailableTranscript();
      if (pendingUserText && !speechTranscriptCommitted) {
        if (vadSpeechActive) {
          log.info(
            `[voice-pipeline] ASR pre-flush deferred: userSpeaking=${vadSpeechActive} pending=${JSON.stringify(pendingUserText)}`,
          );
        }
        scheduleMockAnswerCompletion("response pre-flush deferred");
      }
      return;
    }

    const now = Date.now();
    const pendingUserText = bestAvailableTranscript();
    if (
      shouldDeferPreFlush({
        userSpeaking: vadSpeechActive,
        lastSpeechStartedAt,
        nowMs: now,
        recentSpeechMs: DEFAULT_SPEECH_STARTED_RECENT_MS,
      })
    ) {
      if (pendingUserText) {
        log.info(
          `[voice-pipeline] ASR pre-flush deferred: userSpeaking=${vadSpeechActive} pending=${JSON.stringify(pendingUserText)}`,
        );
        if (ctx.practiceMode === "coach") {
          scheduleSpeechFinalize("response pre-flush deferred", USER_TRANSCRIPT_STABILITY_MS);
        } else {
          scheduleMockAnswerCompletion("response pre-flush deferred");
        }
      }
      return;
    }

    if (!speechTranscriptCommitted && pendingUserText) {
      if (transcriptLooksStable() && !vadSpeechActive) {
        volcAsrPreFlushed = true;
        log.info(`ASR pre-flush: ${JSON.stringify(pendingUserText)}`);
        finalizeUserTurn("response pre-flush");
      } else {
        log.info(`ASR pre-flush deferred (transcript unstable): ${JSON.stringify(pendingUserText)}`);
        scheduleSpeechFinalize("response pre-flush", USER_TRANSCRIPT_STABILITY_MS);
      }
      return;
    }

    if (volcAsrAccumulator.trim()) {
      log.debug(`Volc ASR pre-flush skipped (already committed): ${JSON.stringify(volcAsrAccumulator.trim())}`);
      volcAsrAccumulator = "";
      volcAsrPreFlushed = true;
    }
  }

  function buildRealtimeAudioInputConfig() {
    return {
      format: { type: "audio/pcm", rate: 24000 as const },
      noise_reduction: { type: "far_field" as const },
      transcription: { model: OPENAI_REALTIME_TRANSCRIPTION_MODEL },
      turn_detection: {
        type: "semantic_vad" as const,
        eagerness: "low" as const,
        create_response: false,
        interrupt_response: true,
      },
    };
  }

  function setOpenAiTranscriptionEnabled(enabled: boolean, reason: string) {
    // Keep OpenAI transcription active unless Volcengine is explicitly
    // the primary ASR and healthy.
    if (!enabled) {
      log.info(`OpenAI transcription kept warm (${reason})`);
      return;
    }
    if (openAiTranscriptionEnabled === enabled) return;
    openAiTranscriptionEnabled = enabled;
    log.info(`OpenAI transcription ${enabled ? "enabled" : "disabled"} (${reason})`);

    if (!oaiWs || oaiWs.readyState !== WebSocket.OPEN) return;
    oaiWs.send(JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        audio: {
          input: enabled
            ? buildRealtimeAudioInputConfig()
            : {
                format: { type: "audio/pcm", rate: 24000 },
                noise_reduction: { type: "far_field" },
                turn_detection: {
                  type: "semantic_vad",
                  eagerness: "low",
                  create_response: false,
                  interrupt_response: true,
                },
              },
        },
      },
    }));
  }

  function markInterviewComplete(reason: string) {
    if (!pendingInterviewComplete) return;
    pendingInterviewComplete = false;
    if (interviewCompleteTimer) {
      clearTimeout(interviewCompleteTimer);
      interviewCompleteTimer = null;
    }
    send({ type: "interview_complete" });
    log.info(`Interview complete (${reason})`);
  }

  // ── Volcengine Big-Model streaming ASR ──────────────────────────────
  let volcWs: WebSocket | null = null;
  let volcAlive = false;
  let volcAsrAccumulator = "";
  let volcAsrPreFlushed = false;
  let volcKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let volcSessionErrorLogged = false;
  let volcAudioSeq = 1;

  async function connectVolcAsr() {
    if (!USE_VOLC_ASR_INTERIMS) return;
    if (volcKeepAliveTimer) { clearInterval(volcKeepAliveTimer); volcKeepAliveTimer = null; }
    try {
      const reqid = randomUUID().replace(/-/g, "");
      volcAudioSeq = 1;

      const asrConfig: BigModelAsrConfig = {
        format: "pcm",
        rate: 16000,
        bits: 16,
        channels: 1,
        codec: "raw",
        showUtterance: true,
        resultType: "single",
        enablePunc: true,
        endWindowSize: 500,
        forceToSpeechTime: 1000,
      };

      const wsHeaders = buildBigModelHeaders(VOLC_ASR_APPID, VOLC_ASR_TOKEN, reqid);
      volcWs = new WebSocket(BIGMODEL_ASR_URL, { headers: wsHeaders });

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Volcengine ASR connect timeout")), 10_000);
        volcWs!.on("open", () => { clearTimeout(t); resolve(); });
        volcWs!.on("error", (e) => { clearTimeout(t); reject(e); });
      });

      // Register message handler BEFORE sending the init request so we
      // don't miss the ACK or an early error.
      volcWs.on("message", (data: Buffer) => {
        try {
          const resp = parseAsrResponse(Buffer.from(data));

          // SERVER_ACK (0x0b) confirms the init or an audio chunk — mark alive on first one
          if (resp.messageType === 0x0b) {
            if (!volcAlive) {
              volcAlive = true;
              log.info("Volcengine Big-Model ASR connected (ACK received)");
              if (USE_VOLC_ASR_PRIMARY) {
                setOpenAiTranscriptionEnabled(false, "Volcengine ASR connected");
              }
            }
            return;
          }

          if (resp.errorCode || (resp.code && resp.code !== 1000)) {
            const code = resp.code || resp.errorCode;
            const isSessionDead = code === 45000081 || code === 55000000;
            if (!isSessionDead || !volcSessionErrorLogged) {
              log.warn(`Volcengine ASR error: code=${code} ${resp.message || resp.errorMessage || ""}`);
              if (isSessionDead) volcSessionErrorLogged = true;
            }
            if (!volcAlive) {
              volcAlive = false;
              setOpenAiTranscriptionEnabled(true, `Volcengine ASR error ${code}`);
              volcWs?.close();
            } else if (isSessionDead) {
              log.warn("Volcengine ASR session expired — reconnecting...");
              volcAlive = false;
              volcSessionErrorLogged = false;
              setOpenAiTranscriptionEnabled(true, "Volcengine ASR session expired");
              volcWs?.close();
            }
            return;
          }

          if (!volcAlive) return;

          if (resp.utterances && resp.utterances.length > 0) {
            const utt = resp.utterances[0];
            if (utt.text && !volcAsrPreFlushed) {
              handleVolcInterimText(utt.text, "Volc ASR");
            }
            if (utt.definite) {
              handleVolcFinalText("volc definite", "Volc ASR");
            }
          } else if (resp.text && !volcAsrPreFlushed) {
            handleVolcInterimText(resp.text, "Volc ASR final");

            if (resp.isLastPackage) {
              handleVolcFinalText("volc final", "Volc ASR final");
            }
          }
        } catch (err) {
          log.error("Volcengine ASR parse error:", err);
        }
      });

      volcWs.send(buildBigModelFullRequest(asrConfig, reqid));

      // Mark alive optimistically — the message handler above will set
      // volcAlive=true on ACK or false on error.  Audio forwarding
      // checks volcAlive so it's safe to start sending immediately.
      volcAlive = true;

      volcWs.on("close", () => {
        volcAlive = false;
        setOpenAiTranscriptionEnabled(true, "Volcengine ASR closed");
        if (!browserClosed && !interviewDone) reconnectVolcAsr();
      });

      volcWs.on("error", (err: Error) => {
        log.error("Volcengine ASR WS error:", err.message);
      });

      volcKeepAliveTimer = setInterval(() => {
        if (!volcAlive || !volcWs || volcWs.readyState !== WebSocket.OPEN) return;
        volcAudioSeq++;
        volcWs.send(buildBigModelAudioRequest(Buffer.alloc(3200), volcAudioSeq));
      }, 5_000);

      log.info("Volcengine Big-Model ASR WebSocket open, waiting for ACK...");
    } catch (err) {
      log.error("Volcengine ASR connection failed:", err instanceof Error ? err.message : err);
      volcAlive = false;
      setOpenAiTranscriptionEnabled(true, "Volcengine ASR connection failed");
    }
  }

  function reconnectVolcAsr() {
    if (browserClosed || interviewDone) return;
    setTimeout(() => connectVolcAsr(), 2_000);
  }

  function cleanupVolcAsr() {
    volcAlive = false;
    setOpenAiTranscriptionEnabled(true, "Volcengine ASR cleanup");
    if (volcKeepAliveTimer) { clearInterval(volcKeepAliveTimer); volcKeepAliveTimer = null; }
    if (volcWs && volcWs.readyState === WebSocket.OPEN) {
      try {
        volcAudioSeq++;
        volcWs.send(buildBigModelAudioRequest(Buffer.alloc(0), volcAudioSeq, true));
      } catch { /* ignore */ }
    }
    volcWs?.close();
    volcWs = null;
  }

  function sendAudioToVolc(pcm16kBuf: Buffer) {
    if (!volcAlive || !volcWs || volcWs.readyState !== WebSocket.OPEN) return;
    volcAudioSeq++;
    volcWs.send(buildBigModelAudioRequest(pcm16kBuf, volcAudioSeq));
  }

  // Start Volcengine Big-Model ASR
  connectVolcAsr();

  // Keepalive: 100ms silence at 24kHz (24000 * 0.1 * 2 bytes = 4800 bytes)
  let lastAudioSentToOai = Date.now();
  const SILENCE_100MS_24K = Buffer.alloc(4800).toString("base64");
  const keepaliveTimer = setInterval(() => {
    if (!oaiWs || oaiWs.readyState !== WebSocket.OPEN) return;
    if ((Date.now() - lastAudioSentToOai) > 4_000) {
      oaiWs.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: SILENCE_100MS_24K,
      }));
    }
  }, 5_000);

  // Stall recovery + liveness check
  const STALL_AFTER_COMMIT_MS = 15_000;
  const LIVENESS_RESPONSE_STALL_MS = 90_000;
  const LIVENESS_INPUT_WINDOW_MS = 60_000;
  const livenessTimer = setInterval(() => {
    if (browserClosed || interviewDone || reconnecting) return;
    if (!oaiWs || oaiWs.readyState !== WebSocket.OPEN) return;
    const now = Date.now();

    const pendingForStall = bestAvailableTranscript();
    if (
      ctx.practiceMode !== "coach" &&
      lastTranscriptCommittedAt > 0 &&
      !responseInFlight &&
      !isTransitioning &&
      (now - lastTranscriptCommittedAt) >= STALL_AFTER_COMMIT_MS &&
      (now - lastOaiActivity) >= STALL_AFTER_COMMIT_MS
    ) {
      log.warn(
        `[voice-stall] No assistant activity ${Math.round((now - lastTranscriptCommittedAt) / 1000)}s after user commit — requesting response`,
      );
      lastTranscriptCommittedAt = 0;
      requestAssistantResponse("stall recovery after commit");
      return;
    }

    if (
      ctx.practiceMode !== "coach" &&
      !speechTranscriptCommitted &&
      pendingForStall &&
      isSubstantiveTranscript(pendingForStall, transcriptThresholds) &&
      !vadSpeechActive &&
      lastVadSpeechEnd > 0 &&
      (now - lastVadSpeechEnd) >= STALL_AFTER_COMMIT_MS &&
      !responseInFlight &&
      !isTransitioning &&
      (now - lastOaiActivity) >= STALL_AFTER_COMMIT_MS
    ) {
      log.warn(
        `[voice-stall] Substantive answer waiting ${Math.round((now - lastVadSpeechEnd) / 1000)}s after speech stopped — scheduling mock response`,
      );
      scheduleMockAnswerCompletion("stall recovery after speech stop");
      return;
    }

    const userRecentlyActive =
      lastMeaningfulUserInput > 0 &&
      (now - lastMeaningfulUserInput) < LIVENESS_INPUT_WINDOW_MS;
    const responseRequestedStalled =
      lastResponseRequestedAt > 0 &&
      (now - lastResponseRequestedAt) > LIVENESS_RESPONSE_STALL_MS;
    const oaiSilent = (now - lastOaiActivity) > LIVENESS_RESPONSE_STALL_MS;
    if (
      userRecentlyActive &&
      responseRequestedStalled &&
      oaiSilent &&
      !responseInFlight
    ) {
      log.warn(
        `[voice-stall] User active but assistant silent for ${Math.round(LIVENESS_RESPONSE_STALL_MS / 1000)}s after response.create — forcing reconnect`,
      );
      oaiWs.close();
    }
  }, 10_000);

  // ── OpenAI event handler ──────────────────────────────────────────

  function attachOaiHandlers(ws: WebSocket) {
    ws.on("message", (data: Buffer) => {
      if (ws !== oaiWs) return;
      lastOaiActivity = Date.now();
      try {
        const msg = JSON.parse(data.toString());

        // Log meaningful events (skip high-frequency audio/transcript deltas)
        if (msg.type && !msg.type.startsWith("response.output_audio.")
            && msg.type !== "response.output_audio_transcript.delta"
            && msg.type !== "input_audio_buffer.speech_started"
            && msg.type !== "input_audio_buffer.speech_stopped") {
          log.debug(`OAI event: ${msg.type}`);
        }

        switch (msg.type) {
          // ── Session lifecycle ──
          case "error": {
            const errorMessage = msg.error?.message || JSON.stringify(msg.error);
            if (/Cancellation failed: no active response found/i.test(errorMessage)) {
              responseInFlight = false;
              log.debug(`Ignoring benign OpenAI cancel error: ${errorMessage}`);
              break;
            }
            if (
              reconnecting &&
              /input_text|output_text|content type/i.test(errorMessage)
            ) {
              log.warn(
                `[reconnect] OpenAI conversation replay error (continuing session): ${errorMessage}`,
              );
              break;
            }
            log.error("OpenAI error:", errorMessage);
            break;
          }

          case "response.created":
            responseInFlight = true;
            break;

          // ── ASR events (OpenAI Whisper fallback only) ──
          case "conversation.item.input_audio_transcription.delta": {
            if (!openAiTranscriptionEnabled || speechTranscriptCommitted) break;
            handleWhisperDelta(msg.delta || "");
            break;
          }

          case "conversation.item.input_audio_transcription.failed": {
            if (!openAiTranscriptionEnabled) break;
            const errMsg = msg.error?.message || JSON.stringify(msg.error);
            log.error(`ASR transcription failed: ${errMsg}`);
            break;
          }

          case "conversation.item.input_audio_transcription.completed": {
            if (!openAiTranscriptionEnabled || speechTranscriptCommitted) break;
            handleWhisperCompletedTranscript(msg.transcript || "");
            break;
          }

          // ── Model audio output ──
          case "response.output_audio.delta": {
            clearQuestionPrompt();
            modelIsSpeaking = true;
            if (!isTransitioning && msg.delta) {
              if (!responseAudioStarted) {
                responseAudioStarted = true;
                responseAudioStartedAt = Date.now();
                for (const t of pendingTtsText) send({ type: "tts_text", data: { text: t } });
                pendingTtsText = [];
              }
              lastTtsAudioTime = Date.now();
              const int16Buf = Buffer.from(msg.delta, "base64");
              const float32Buf = int16ToFloat32(int16Buf);
              responseTtsBytes += float32Buf.length;
              sendBinary(float32Buf);
            } else if (isTransitioning && msg.delta) {
              log.warn("Audio suppressed: isTransitioning=true");
            }
            break;
          }

          // ── Model text transcript output ──
          case "response.output_audio_transcript.delta": {
            if (msg.delta) {
              outputTranscriptBuffer += msg.delta;
              if (responseAudioStarted) {
                send({ type: "tts_text", data: { text: msg.delta } });
              } else {
                pendingTtsText.push(msg.delta);
              }
            }
            break;
          }

          // ── Function call arguments complete ──
          case "response.function_call_arguments.done": {
            if (msg.name === "signal_question_change") {
              let args: { questionIndex?: number; userRequested?: boolean } = {};
              try { args = JSON.parse(msg.arguments || "{}"); } catch { /* ignore */ }
              const newIdx = args.questionIndex ?? (currentQuestionIndex + 1);
              const userRequested = args.userRequested === true;
              log.info(`OpenAI called signal_question_change → Q${newIdx + 1}${userRequested ? " (user requested)" : ""}`);

              // Already on the requested question — no-op, just tell the model.
              if (newIdx >= 0 && newIdx < sortedQuestions.length && newIdx === currentQuestionIndex) {
                log.info(`Already on Q${newIdx + 1}, ignoring duplicate signal_question_change`);
                pendingFunctionCalls.push({
                  callId: msg.call_id,
                  name: msg.name,
                  args: `You are already on question ${newIdx + 1}. Continue the conversation naturally — do NOT call signal_question_change again unless the participant is ready for a different question.`,
                });
                break;
              }

              // Reject premature transitions: block if the user hasn't spoken,
              // not enough time has passed, or insufficient words (forward only).
              // Backward transitions and explicit user requests bypass the word count guard.
              const dwellMs = Date.now() - questionEnteredAt;
              const isForward = newIdx > currentQuestionIndex && newIdx < sortedQuestions.length;
              const needsWordGuard = isForward && !userRequested;
              if (newIdx < sortedQuestions.length && (lastUserInput === 0 || dwellMs < MIN_QUESTION_DWELL_MS || (needsWordGuard && userCommittedWordsThisQuestion < MIN_WORDS_BEFORE_TRANSITION))) {
                const reason = lastUserInput === 0
                  ? "the participant has not spoken yet"
                  : (needsWordGuard && userCommittedWordsThisQuestion < MIN_WORDS_BEFORE_TRANSITION)
                    ? `only ${userCommittedWordsThisQuestion} word(s) from participant (minimum ${MIN_WORDS_BEFORE_TRANSITION})`
                    : `only ${Math.round(dwellMs / 1000)}s on this question (minimum ${MIN_QUESTION_DWELL_MS / 1000}s)`;
                log.warn(`Rejected premature question change: ${reason}`);
                pendingFunctionCalls.push({
                  callId: msg.call_id,
                  name: msg.name,
                  args: `Rejected: ${reason}. You MUST continue discussing question ${currentQuestionIndex + 1} and wait for a substantive response before calling signal_question_change. Do NOT verbally say you are moving to another question — the transition was blocked.`,
                });
                break;
              }

              clearPendingTransition();

              let result: string;
              if (newIdx >= sortedQuestions.length) {
                result = "Interview is now complete. Please give a brief farewell.";
              } else {
                result = `Moved to question ${newIdx + 1}: "${sortedQuestions[newIdx]?.text}". Please naturally transition and ask this question.`;
              }

              if (newIdx >= sortedQuestions.length) {
                if (!interviewDone) {
                  interviewDone = true;
                  pendingInterviewComplete = true;
                  log.info("Interview ending — waiting for farewell TTS to finish");
                  interviewCompleteTimer = setTimeout(() => {
                    if (pendingInterviewComplete) {
                      markInterviewComplete("timeout fallback");
                    }
                  }, 15_000);
                }
              } else if (newIdx >= 0 && newIdx !== currentQuestionIndex) {
                const dir = newIdx > currentQuestionIndex ? "next" : "previous";
                const arrow = dir === "next" ? "→" : "←";
                send({ type: "transitioning", auto: true, direction: dir });
                currentQuestionIndex = newIdx;
                questionEnteredAt = Date.now();
                userCommittedWordsThisQuestion = 0;
                disableTools();
                send({
                  type: "question_change",
                  questionIndex: currentQuestionIndex,
                  totalQuestions: sortedQuestions.length,
                  auto: true,
                });
                pushHistory("user", `[Moved to question ${currentQuestionIndex + 1}: "${sortedQuestions[currentQuestionIndex]?.text}"]`);
                log.info(`${arrow} Q${currentQuestionIndex + 1}/${sortedQuestions.length}`);
              }

              // Store for batch response after response.done
              pendingFunctionCalls.push({
                callId: msg.call_id,
                name: msg.name,
                args: result,
              });
            }
            break;
          }

          // ── VAD events ──
          case "input_audio_buffer.speech_started":
            handleSpeechStartedEvent();
            break;

          case "input_audio_buffer.speech_stopped":
            handleSpeechStoppedEvent();
            break;

          // ── Response complete ──
          case "response.done": {
            const respStatus = msg.response?.status || "unknown";
            const respOutputCount = msg.response?.output?.length ?? 0;
            responseInFlight = false;
            const queuedResponse = takeQueuedAssistantResponse();

            // Flush pending ASR debounce
            if (pendingAsrUpdate) {
              clearTimeout(pendingAsrUpdate);
              pendingAsrUpdate = null;
              if (inputTranscriptBuffer) {
                send({ type: "asr", data: { results: [{ text: inputTranscriptBuffer }] } });
              }
            }

            const hadTts = !!(outputTranscriptBuffer || modelIsSpeaking);
            const capturedModelText = outputTranscriptBuffer;
            const completedFarewellTurn = pendingInterviewComplete && hadTts && responseTtsBytes > 0;
            outputTranscriptBuffer = "";
            modelIsSpeaking = false;
            const inferredFarewell =
              !pendingInterviewComplete &&
              currentQuestionIndex >= sortedQuestions.length - 1 &&
              !!capturedModelText &&
              looksLikeFarewell(capturedModelText, isZh);

            if (inferredFarewell) {
              interviewDone = true;
              pendingInterviewComplete = true;
              log.warn("Inferred interview completion from farewell text on final question");
            }

            if (hadTts && responseTtsBytes > 0) {
              // Flush any pending user text BEFORE committing agent text
              // so the transcript order matches the conversation order.
              if (ctx.practiceMode === "coach") {
                flushPendingUserTurnBeforeAssistant();
                if (inputTranscriptBuffer) {
                  flushUserInput();
                }
              } else if (
                !speechTranscriptCommitted &&
                bestAvailableTranscript() &&
                !vadSpeechActive
              ) {
                scheduleMockAnswerCompletion("after assistant turn");
              }
              if (capturedModelText) {
                log.info(`[voice-pipeline] response.done / TTS done (${responseTtsBytes}B sent)`);
                pushHistory("assistant", capturedModelText);
                lastTranscriptCommittedAt = 0;
              }
              send({ type: "tts_ended" });
            } else if (hadTts) {
              log.info(`TTS interrupted before audio (0B): ${JSON.stringify(capturedModelText)}`);
              pendingTtsText = [];
              if (lastUserInput === 0 && pendingFunctionCalls.length === 0 && !interviewDone) {
                log.warn("Greeting produced 0B audio — auto-retrying");
                requestAssistantResponse("greeting retry", { tool_choice: "none" });
              }
            }
            responseTtsBytes = 0;
            responseAudioStarted = false;
            responseAudioStartedAt = 0;

            // Detect empty responses and retry: the model sometimes
            // produces responses with no audio and no function calls.
            if (!hadTts && pendingFunctionCalls.length === 0 && respOutputCount === 0 && !interviewDone && !queuedResponse) {
              const suppress = shouldSuppressEmptyResponseRetry({
                userSpeaking: vadSpeechActive,
                lastSpeechStartedAt,
                nowMs: Date.now(),
                respStatus: String(respStatus),
                hasPendingTranscript:
                  !!bestAvailableTranscript() && !speechTranscriptCommitted,
                recentSpeechMs: DEFAULT_SPEECH_STARTED_RECENT_MS,
              });
              if (suppress.suppress) {
                log.info(
                  `[voice-pipeline] skipped empty-response retry because ${suppress.reason}`,
                );
                logVoicePipelineState("empty-response retry suppressed");
              } else {
                emptyResponseRetries++;
                if (emptyResponseRetries <= MAX_EMPTY_RETRIES) {
                  log.warn(`Empty response (status=${respStatus}, attempt ${emptyResponseRetries}/${MAX_EMPTY_RETRIES}) — nudging model to speak`);
                  requestAssistantResponse(`empty response retry ${emptyResponseRetries}`);
                } else {
                  log.error(`Empty response (status=${respStatus}) — exhausted retries, giving up`);
                  emptyResponseRetries = 0;
                }
              }
            } else if (hadTts) {
              emptyResponseRetries = 0;
            }

            // Send function call results and trigger follow-up response
            if (pendingFunctionCalls.length > 0) {
              if (queuedResponse) {
                queuedAssistantResponse = queuedResponse;
              }
              const calls = [...pendingFunctionCalls];
              pendingFunctionCalls = [];
              for (const fc of calls) {
                ws.send(JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: fc.callId,
                    output: fc.args,
                  },
                }));
              }
              requestAssistantResponse("function call follow-up");
            } else if (queuedResponse) {
              requestAssistantResponse(`queued after ${queuedResponse.reason}`, queuedResponse.response);
            }

            if (completedFarewellTurn) {
              markInterviewComplete("after farewell");
            }

            if (inputTranscriptBuffer) {
              scheduleInputFlush();
            }
            break;
          }
        }
      } catch (err) {
        log.error("Error parsing OpenAI message:", err);
      }
    });

    ws.on("close", () => {
      if (ws !== oaiWs) return;
      const sessionDuration = ((Date.now() - oaiSessionStart) / 1000).toFixed(1);
      log.info(`OpenAI WS closed (session lasted ${sessionDuration}s)`);
      oaiWs = null;

      if (browserClosed || interviewDone) return;

      if (pendingInputFlush) { clearTimeout(pendingInputFlush); pendingInputFlush = null; }
      if (pendingAsrUpdate) { clearTimeout(pendingAsrUpdate); pendingAsrUpdate = null; }

      if (inputTranscriptBuffer) {
        pushHistory("user", inputTranscriptBuffer);
      }
      if (outputTranscriptBuffer) {
        pushHistory("assistant", outputTranscriptBuffer);
        outputTranscriptBuffer = "";
      }
      modelIsSpeaking = false;
      pendingFunctionCalls = [];

      send({ type: "session_reconnecting" });

      log.info("Attempting auto-reconnect...");
      reconnectOai().catch((err) => {
        log.error("Reconnect failed:", err);
        if (browserWs.readyState === WebSocket.OPEN) {
          send({ type: "disconnected" });
          browserWs.close();
        }
      });
    });

    ws.on("error", (err: Error) => {
      log.error("OpenAI WS error:", err.message);
    });
  }

  // ── OpenAI connection ─────────────────────────────────────────────

  async function connectOai(): Promise<WebSocket> {
    const ws = new WebSocket(OPENAI_WS_URL, {
      headers: websocketHeadersForRealtimeUpstream(),
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("OpenAI connect timeout")), 10_000);
      ws.on("open", () => { clearTimeout(t); resolve(); });
      ws.on("error", (e) => { clearTimeout(t); reject(e); });
    });

    await waitForOpenAiSessionCreated(ws, "interview");

    const systemPrompt = buildSystemPrompt(ctx, currentQuestionIndex);
    const coachPromptApplied = ctx.practiceMode === "coach";
    log.info(`[coach-mode] coach prompt applied=${coachPromptApplied}`);

    ws.send(JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: systemPrompt,
        output_modalities: ["audio"],
        audio: {
          input: buildRealtimeAudioInputConfig(),
          output: {
            format: { type: "audio/pcm", rate: 24000 },
            voice: REALTIME_VOICE,
          },
        },
        tools: OPENAI_TOOLS,
        tool_choice: "auto",
      },
    }));

    await waitForOpenAiSessionUpdated(ws, "interview");

    return ws;
  }

  async function reconnectOai() {
    if (reconnecting) return;
    reconnecting = true;
    const MAX_RETRIES = 3;

    await new Promise((r) => setTimeout(r, 500));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log.info(`Reconnect attempt ${attempt}/${MAX_RETRIES}...`);

        const ws = await connectOai();
        oaiWs = ws;
        oaiSessionStart = Date.now();
        lastOaiActivity = Date.now();
        lastAudioSentToOai = Date.now();
        attachOaiHandlers(ws);

        // OpenAI doesn't have session resumption tokens —
        // replay conversation history to restore context.
        let codeContext = "";
        if (latestCode) {
          codeContext = `\n\nThe participant's current code (${latestCodeLanguage}):\n\`\`\`${latestCodeLanguage}\n${latestCode}\n\`\`\``;
        }
        const resumePrompt = `[SYSTEM] Session reconnected. The UI currently shows question ${currentQuestionIndex + 1}: "${sortedQuestions[currentQuestionIndex]?.text}".${codeContext}\nDo NOT re-introduce yourself, re-ask the current question, or repeat anything you've already said. Wait silently for the participant to speak, then respond naturally. If you were in the middle of saying something, do NOT repeat it.`;

        if (conversationHistory.length > 0) {
          const MAX_REPLAY_TURNS = 12;
          const recentHistory = conversationHistory.length > MAX_REPLAY_TURNS
            ? conversationHistory.slice(-MAX_REPLAY_TURNS)
            : conversationHistory;

          const { replayed, failed } = replayConversationHistory(ws, recentHistory);
          log.info(
            `[reconnect] Replayed ${replayed}/${recentHistory.length} history turns (${conversationHistory.length} total${failed ? `, ${failed} send failures` : ""})`,
          );
        }

        sendConversationTextMessage(ws, "system", resumePrompt);

        log.info("Reconnected successfully");
        reconnecting = false;
        send({ type: "session_reconnected" });

        if (pendingQuestionPrompt) {
          const prompt = pendingQuestionPrompt;
          pendingQuestionPrompt = null;
          if (pendingPromptTimer) { clearTimeout(pendingPromptTimer); pendingPromptTimer = null; }
          sendQuestionPrompt(prompt);
        }
        return;
      } catch (err) {
        log.warn(`Reconnect attempt ${attempt} failed:`, err);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    reconnecting = false;
    throw new Error("All reconnect attempts failed");
  }

  // ── Initial connection ────────────────────────────────────────────

  try {
    oaiWs = await connectOai();
    oaiSessionStart = Date.now();
    log.info("OpenAI session established");
    attachOaiHandlers(oaiWs);

    send({ type: "ready", sessionId: "openai-session" });
    send({
      type: "question_change",
      questionIndex: currentQuestionIndex,
      totalQuestions: sortedQuestions.length,
    });

    // Give the browser time to set up its AudioContext before streaming audio
    await new Promise((r) => setTimeout(r, 1_500));

    // Trigger initial greeting
    const greeting = ctx.practiceMode === "coach"
      ? buildCoachModeInitialSystemGreeting(currentQuestionIndex)
      : currentQuestionIndex > 0
        ? `The participant is returning to the interview. Continue from question ${currentQuestionIndex + 1}.`
        : "The participant has just joined. Please greet them and begin with question 1.";

    sendConversationTextMessage(oaiWs, "system", `[SYSTEM] ${greeting}`);
    requestAssistantResponse("initial greeting", { tool_choice: "none" });
  } catch (err) {
    log.error("Failed to connect to OpenAI:", err);
    send({
      type: "error",
      message: `OpenAI connection failed: ${err instanceof Error ? err.message : err}`,
    });
    browserWs.close();
    return;
  }

  // ── Handle Browser → OpenAI ───────────────────────────────────────

  function requestTransition(
    targetIdx: number,
    directionLabel: string,
    reason: "button" | "user_request" = "button",
  ) {
    clearPendingTransition();
    clearQuestionPrompt();
    cancelOngoingResponse();

    isTransitioning = true;
    const direction = targetIdx > currentQuestionIndex ? "next" : "previous";
    send({ type: "transitioning", direction });

    setTimeout(() => {
      if (targetIdx === currentQuestionIndex) {
        isTransitioning = false;
        return;
      }
      if (targetIdx >= sortedQuestions.length) {
        isTransitioning = false;
        if (!interviewDone) {
          interviewDone = true;
          pendingInterviewComplete = true;
          log.info("Interview ending (button) — waiting for farewell");
          interviewCompleteTimer = setTimeout(() => {
            if (pendingInterviewComplete) {
              markInterviewComplete("timeout fallback");
            }
          }, 15_000);
        }
        return;
      }
      const dir = targetIdx > currentQuestionIndex ? "→" : "←";
      currentQuestionIndex = targetIdx;
      questionEnteredAt = Date.now();
      userCommittedWordsThisQuestion = 0;
      disableTools();
      pushHistory("user", `[Moved to question ${currentQuestionIndex + 1}: "${sortedQuestions[currentQuestionIndex]?.text}"]`);
      send({
        type: "question_change",
        questionIndex: currentQuestionIndex,
        totalQuestions: sortedQuestions.length,
      });
      isTransitioning = false;
      log.info(`${dir} Q${currentQuestionIndex + 1}/${sortedQuestions.length}`);

      const prompt = reason === "user_request"
        ? `[SYSTEM] The participant explicitly asked to go ${directionLabel.toLowerCase()}. We are now on question ${currentQuestionIndex + 1}: "${sortedQuestions[currentQuestionIndex]?.text}". Briefly acknowledge the transition and introduce this question now.`
        : `[SYSTEM] The participant clicked "${directionLabel}". We are now on question ${currentQuestionIndex + 1}: "${sortedQuestions[currentQuestionIndex]?.text}". Briefly introduce this question now.`;
      sendQuestionPrompt(prompt);
    }, 500);
  }

  function tryHandleExplicitUserNavigation(text: string): boolean {
    const userText = text.trim();
    if (!userText || isTransitioning || interviewDone) return false;

    if (ctx.practiceMode === "coach" && isCoachRetryPhrase(userText)) {
      log.info(`Coach retry from voice: "${userText}"`);
      handleCoachRetryQuestion("voice");
      return true;
    }

    if (ctx.practiceMode === "coach" && isCoachNextPhrase(userText)) {
      const nextIdx = Math.min(currentQuestionIndex + 1, sortedQuestions.length);
      if (nextIdx === currentQuestionIndex) return false;
      log.info(`Coach next from voice: "${userText}"`);
      requestTransition(nextIdx, "Next Question", "user_request");
      return true;
    }

    if (
      isStrictFastPrevRequest(userText) ||
      isFastPrevRequest(userText) ||
      (isUserPrevRequest(userText) && countTranscriptWords(userText) <= 6)
    ) {
      if (currentQuestionIndex <= 0) return false;
      log.info(`Fast-path PREV transition from user: "${userText}"`);
      requestTransition(currentQuestionIndex - 1, "Previous Question", "user_request");
      return true;
    }

    if (isClearNextQuestionCommand(userText).detected) {
      const nextIdx = Math.min(currentQuestionIndex + 1, sortedQuestions.length);
      if (nextIdx === currentQuestionIndex) return false;
      log.info(`Fast-path NEXT transition from user: "${userText}"`);
      requestTransition(nextIdx, "Next Question", "user_request");
      return true;
    }

    return false;
  }

  browserWs.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "coach_answer_done") {
        if (ctx.practiceMode !== "coach") return;
        log.info("Browser requested coach_answer_done");
        handleCoachAnswerDone();
        return;
      }
      if (msg.type === "coach_retry_question") {
        if (ctx.practiceMode !== "coach") return;
        log.info("Browser requested coach_retry_question");
        handleCoachRetryQuestion("ui");
        return;
      }

      if (msg.type === "next_question") {
        log.info("Browser requested next question");
        const nextIdx = Math.min(currentQuestionIndex + 1, sortedQuestions.length);
        if (nextIdx !== currentQuestionIndex) {
          if (ctx.practiceMode === "coach") {
            resetCoachAnswerBuffers();
          }
          requestTransition(nextIdx, "Next Question");
        }
        return;
      }
      if (msg.type === "prev_question") {
        log.info("Browser requested previous question");
        const prevIdx = Math.max(currentQuestionIndex - 1, 0);
        if (prevIdx !== currentQuestionIndex) {
          requestTransition(prevIdx, "Previous Question");
        }
        return;
      }
      if (msg.type === "ping") {
        send({ type: "pong" });
        return;
      }

      if (reconnecting) return;
      if (!oaiWs || oaiWs.readyState !== WebSocket.OPEN) return;

      if (msg.type === "audio" && msg.data) {
        if (isTransitioning) return;
        const pcm16k = Buffer.from(msg.data, "hex");
        const nowMs = Date.now();

        const samples = new Int16Array(pcm16k.buffer, pcm16k.byteOffset, pcm16k.length / 2);
        let sumSq = 0;
        for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
        const rms = Math.sqrt(sumSq / (samples.length || 1));
        const aboveNoiseFloor = rms >= MIN_AUDIO_RMS;
        const withinSpeechStopGrace = nowMs < speechStopForwardGraceUntil;
        const looksLikeContinuationSpeech = rms >= CONTINUATION_AUDIO_RMS;

        // Gate: before VAD detects speech, only forward loud-enough audio
        // to prevent ambient noise from triggering the VAD. Once speech is
        // active, always forward (including silence) so the VAD can detect
        // when speech ends.
        if (!vadSpeechActive && !aboveNoiseFloor) {
          if (!withinSpeechStopGrace || !looksLikeContinuationSpeech) return;
        }

        const inEchoCooldown = (nowMs - lastTtsAudioTime) < TTS_ECHO_COOLDOWN_MS;
        const bargeInFrameEligible =
          inEchoCooldown &&
          modelIsSpeaking &&
          responseAudioStarted &&
          responseAudioStartedAt > 0 &&
          nowMs - responseAudioStartedAt >= DEFAULT_TTS_BARGE_IN_MIN_AUDIO_MS &&
          responseTtsBytes >= DEFAULT_TTS_BARGE_IN_MIN_AUDIO_BYTES &&
          rms >= TTS_BARGE_IN_RMS;
        if (bargeInFrameEligible) {
          ttsBargeInFrames += 1;
        } else {
          ttsBargeInFrames = 0;
        }
        const allowBargeInDuringTts = shouldAllowTtsBargeIn({
          inEchoCooldown,
          modelIsSpeaking,
          responseAudioStarted,
          ttsAudioStartedAt: responseAudioStartedAt,
          nowMs,
          responseTtsBytes,
          rms,
          thresholdRms: TTS_BARGE_IN_RMS,
          consecutiveFrames: ttsBargeInFrames,
          thresholdFrames: TTS_BARGE_IN_FRAME_COUNT,
        });

        if (allowBargeInDuringTts) {
          log.info(`Allowing TTS barge-in after sustained speech (rms=${Math.round(rms)})`);
          ttsBargeInFrames = 0;
          cancelOngoingResponse();
          send({ type: "interrupt" });
        }

        if (!inEchoCooldown || allowBargeInDuringTts) {
          lastAudioSentToOai = Date.now();
          const pcm24k = resample16to24(pcm16k);
          oaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: pcm24k.toString("base64"),
          }));
        }
        if ((!inEchoCooldown || allowBargeInDuringTts) && aboveNoiseFloor) {
          sendAudioToVolc(pcm16k);
        }
        } else if (msg.type === "text_input" && msg.content) {
          const text = (msg.content as string).trim();
          if (text) {
            noteMeaningfulUserActivity("text input");
            queuedAssistantResponse = null;
            pushHistory("user", text);
          if (tryHandleExplicitUserNavigation(text)) {
            return;
          }
          send({ type: "interrupt" });
          // Cancel any ongoing response, send text as user message, trigger new response
          cancelOngoingResponse();
          sendConversationTextMessage(oaiWs, "user", text);
          requestAssistantResponse("text input");
        }
      } else if (msg.type === "code_update") {
        const content = (msg.content as string) || "";
        const language = (msg.language as string) || "plaintext";
        latestCode = content;
        latestCodeLanguage = language;
        if (content) {
          sendConversationTextMessage(
            oaiWs,
            "user",
            `[CODE_UPDATE] The participant's current code (${language}):\n\`\`\`${language}\n${content}\n\`\`\``,
          );
          sendConversationTextMessage(oaiWs, "assistant", "(Noted the code update.)");
        }
      } else if (msg.type === "text" && msg.content) {
        sendConversationTextMessage(
          oaiWs,
          "system",
          `[SYSTEM] Please say the following aloud: ${msg.content}`,
        );
        requestAssistantResponse("system say-aloud");
      } else if (msg.type === "whiteboard_update") {
        const imageDataUrl = (msg.imageDataUrl as string) || "";
        if (imageDataUrl) {
          // Send as an image in a user message
          oaiWs.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{
                type: "input_image",
                image_url: imageDataUrl,
              }],
            },
          }));
          sendConversationTextMessage(oaiWs, "assistant", "(Received whiteboard update.)");
          log.info("Whiteboard image sent to OpenAI");
        }
      }
    } catch (err) {
      log.error("Error handling browser message:", err);
    }
  });

  browserWs.on("close", () => {
    log.info("Browser disconnected");
    browserClosed = true;
    clearInterval(keepaliveTimer);
    clearInterval(livenessTimer);
    clearPendingTransition();
    clearQuestionPrompt();
    clearSpeechFinalizeTimer("browser disconnected");
    clearMockAutoResponseTimer("browser disconnected");
    cleanupVolcAsr();
    if (pendingInputFlush) clearTimeout(pendingInputFlush);
    if (pendingAsrUpdate) clearTimeout(pendingAsrUpdate);
    if (interviewCompleteTimer) clearTimeout(interviewCompleteTimer);
    oaiWs?.close();
  });

  browserWs.on("error", (err) => {
    log.error("Browser WS error:", err.message);
  });
}
