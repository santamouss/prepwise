/** Lightweight delivery signals from transcript + timing (no audio storage). */

export const LONG_PAUSE_THRESHOLD_SECONDS = 2;

export const DEFAULT_SHORT_ANSWER_MAX_WORDS = 40;
export const DEFAULT_LONG_ANSWER_MIN_WORDS = 220;
export const DEFAULT_TARGET_WPM_LOW = 110;
export const DEFAULT_TARGET_WPM_HIGH = 165;

export type DeliveryMetrics = {
  wordCount: number;
  estimatedDurationSeconds: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  hedgingPhraseCount: number;
  longPauseCount: number;
  answerTooShort: boolean;
  answerTooLong: boolean;
};

export type DeliveryAnalysisResult = DeliveryMetrics & {
  fillerWords: string[];
  hedgingPhrases: string[];
  deliverySummary: string;
  suggestions: string[];
};

export type AnalyzeDeliveryInput = {
  transcript: string;
  durationSeconds: number;
  pauseDurations?: number[];
  shortAnswerMaxWords?: number;
  longAnswerMinWords?: number;
  targetWpmLow?: number;
  targetWpmHigh?: number;
};

const FILLER_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bum\b/gi, label: "um" },
  { pattern: /\buh\b/gi, label: "uh" },
  { pattern: /\blike\b/gi, label: "like" },
  { pattern: /\byou know\b/gi, label: "you know" },
  { pattern: /\bbasically\b/gi, label: "basically" },
  { pattern: /\bactually\b/gi, label: "actually" },
];

const HEDGING_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bi think\b/gi, label: "I think" },
  { pattern: /\bmaybe\b/gi, label: "maybe" },
  { pattern: /\bkind of\b/gi, label: "kind of" },
  { pattern: /\bsort of\b/gi, label: "sort of" },
  { pattern: /\bprobably\b/gi, label: "probably" },
];

function countPatternMatches(
  text: string,
  patterns: { pattern: RegExp; label: string }[],
): { count: number; labels: string[] } {
  const labels: string[] = [];
  let count = 0;
  for (const { pattern, label } of patterns) {
    const matches = text.match(pattern);
    if (matches?.length) {
      count += matches.length;
      labels.push(label);
    }
  }
  return { count, labels: Array.from(new Set(labels)) };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeWordsPerMinute(
  wordCount: number,
  durationSeconds: number,
): number {
  const seconds = Math.max(1, durationSeconds);
  return Math.round((wordCount / seconds) * 60);
}

export function analyzeDelivery(input: AnalyzeDeliveryInput): DeliveryAnalysisResult {
  const transcript = input.transcript.trim();
  const wordCount = countWords(transcript);
  const estimatedDurationSeconds = Math.max(1, Math.round(input.durationSeconds));
  const wordsPerMinute = computeWordsPerMinute(wordCount, estimatedDurationSeconds);

  const filler = countPatternMatches(transcript, FILLER_PATTERNS);
  const hedging = countPatternMatches(transcript, HEDGING_PATTERNS);

  const pauseDurations = input.pauseDurations ?? [];
  const longPauseCount = pauseDurations.filter(
    (p) => p >= LONG_PAUSE_THRESHOLD_SECONDS,
  ).length;

  const shortMax = input.shortAnswerMaxWords ?? DEFAULT_SHORT_ANSWER_MAX_WORDS;
  const longMin = input.longAnswerMinWords ?? DEFAULT_LONG_ANSWER_MIN_WORDS;
  const wpmLow = input.targetWpmLow ?? DEFAULT_TARGET_WPM_LOW;
  const wpmHigh = input.targetWpmHigh ?? DEFAULT_TARGET_WPM_HIGH;

  const answerTooShort = wordCount < shortMax;
  const answerTooLong = wordCount >= longMin;

  const suggestions = buildDeliverySuggestions({
    wordCount,
    wordsPerMinute,
    fillerWordCount: filler.count,
    hedgingPhraseCount: hedging.count,
    longPauseCount,
    answerTooShort,
    answerTooLong,
    transcript,
    wpmLow,
    wpmHigh,
  });

  const deliverySummary = buildDeliverySummary({
    wordCount,
    wordsPerMinute,
    fillerWordCount: filler.count,
    hedgingPhraseCount: hedging.count,
    longPauseCount,
    answerTooShort,
    answerTooLong,
    wpmLow,
    wpmHigh,
  });

  return {
    wordCount,
    estimatedDurationSeconds,
    wordsPerMinute,
    fillerWordCount: filler.count,
    hedgingPhraseCount: hedging.count,
    longPauseCount,
    answerTooShort,
    answerTooLong,
    fillerWords: filler.labels,
    hedgingPhrases: hedging.labels,
    deliverySummary,
    suggestions,
  };
}

export type DeliverySuggestionInput = {
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  hedgingPhraseCount: number;
  longPauseCount: number;
  answerTooShort: boolean;
  answerTooLong: boolean;
  transcript: string;
  wpmLow: number;
  wpmHigh: number;
};

export function buildDeliverySuggestions(
  input: DeliverySuggestionInput,
): string[] {
  const suggestions: string[] = [];

  if (input.wordsPerMinute > input.wpmHigh) {
    suggestions.push("Slow down slightly");
  } else if (input.wordsPerMinute < input.wpmLow && !input.answerTooShort) {
    suggestions.push("Pick up the pace slightly");
  }

  if (input.fillerWordCount >= 3) {
    suggestions.push("Use fewer filler words");
  }

  if (input.hedgingPhraseCount >= 2) {
    suggestions.push("Use fewer hedging phrases");
  }

  if (input.longPauseCount >= 2) {
    suggestions.push("Reduce long mid-answer pauses");
  } else if (input.longPauseCount === 0 && !input.answerTooShort && input.wordCount >= 50) {
    suggestions.push("Pause after the result");
  }

  if (openingSoundsHedging(input.transcript)) {
    suggestions.push("Start with a stronger opening");
  }

  if (input.answerTooShort) {
    suggestions.push("Add more structure and detail to your answer");
  }

  if (input.answerTooLong) {
    suggestions.push("Tighten the answer and lead with the headline");
  }

  return Array.from(new Set(suggestions));
}

function openingSoundsHedging(transcript: string): boolean {
  const opening = transcript.trim().split(/\s+/).slice(0, 12).join(" ");
  return HEDGING_PATTERNS.some(({ pattern }) => pattern.test(opening));
}

function buildDeliverySummary(input: {
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  hedgingPhraseCount: number;
  longPauseCount: number;
  answerTooShort: boolean;
  answerTooLong: boolean;
  wpmLow: number;
  wpmHigh: number;
}): string {
  const pace =
    input.wordsPerMinute > input.wpmHigh
      ? "fast"
      : input.wordsPerMinute < input.wpmLow
        ? "slow"
        : "steady";
  const parts = [
    `${input.wordCount} words at ~${input.wordsPerMinute} WPM (${pace} pace)`,
  ];
  if (input.fillerWordCount > 0) {
    parts.push(`${input.fillerWordCount} filler word${input.fillerWordCount === 1 ? "" : "s"}`);
  }
  if (input.hedgingPhraseCount > 0) {
    parts.push(`${input.hedgingPhraseCount} hedging phrase${input.hedgingPhraseCount === 1 ? "" : "s"}`);
  }
  if (input.longPauseCount > 0) {
    parts.push(`${input.longPauseCount} long pause${input.longPauseCount === 1 ? "" : "s"}`);
  }
  if (input.answerTooShort) parts.push("answer was short");
  if (input.answerTooLong) parts.push("answer ran long");
  return parts.join("; ");
}

/** One coach-facing delivery hint (no emotion claims). */
export function pickCoachDeliverySuggestion(
  analysis: DeliveryAnalysisResult,
): string | null {
  return analysis.suggestions[0] ?? null;
}

export function buildCoachDeliverySystemAddendum(
  analysis: DeliveryAnalysisResult | null | undefined,
): string {
  if (!analysis) return "";
  const suggestion = pickCoachDeliverySuggestion(analysis);
  if (!suggestion) return "";
  return `\n\nDelivery signal for the answer they just finished (from transcript/timing only — do not claim emotions): ${analysis.deliverySummary}. If useful, include exactly one brief delivery tip in your coaching, such as: "${suggestion}". Do not invent audio cues or personality traits.`;
}

export type DeliveryAnswerRecord = DeliveryMetrics & {
  questionIndex?: number;
  recordedAt?: string;
};

export type SessionDeliveryInsights = {
  answers: DeliveryAnswerRecord[];
  aggregate?: {
    avgWordsPerMinute: number;
    totalFillerWords: number;
    totalHedgingPhrases: number;
    totalLongPauses: number;
    shortAnswerCount: number;
    longAnswerCount: number;
    topSuggestions: string[];
  };
};

export function aggregateSessionDelivery(
  answers: DeliveryAnswerRecord[],
): SessionDeliveryInsights["aggregate"] {
  if (answers.length === 0) return undefined;

  const suggestionCounts = new Map<string, number>();
  let totalFillerWords = 0;
  let totalHedgingPhrases = 0;
  let totalLongPauses = 0;
  let shortAnswerCount = 0;
  let longAnswerCount = 0;
  let wpmSum = 0;

  for (const answer of answers) {
    wpmSum += answer.wordsPerMinute;
    totalFillerWords += answer.fillerWordCount;
    totalHedgingPhrases += answer.hedgingPhraseCount;
    totalLongPauses += answer.longPauseCount;
    if (answer.answerTooShort) shortAnswerCount += 1;
    if (answer.answerTooLong) longAnswerCount += 1;

    for (const s of buildDeliverySuggestions({
      wordCount: answer.wordCount,
      wordsPerMinute: answer.wordsPerMinute,
      fillerWordCount: answer.fillerWordCount,
      hedgingPhraseCount: answer.hedgingPhraseCount,
      longPauseCount: answer.longPauseCount,
      answerTooShort: answer.answerTooShort,
      answerTooLong: answer.answerTooLong,
      transcript: "",
      wpmLow: DEFAULT_TARGET_WPM_LOW,
      wpmHigh: DEFAULT_TARGET_WPM_HIGH,
    })) {
      suggestionCounts.set(s, (suggestionCounts.get(s) ?? 0) + 1);
    }
  }

  const topSuggestions = Array.from(suggestionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([s]) => s);

  return {
    avgWordsPerMinute: Math.round(wpmSum / answers.length),
    totalFillerWords,
    totalHedgingPhrases,
    totalLongPauses,
    shortAnswerCount,
    longAnswerCount,
    topSuggestions,
  };
}

export function toDeliveryAnswerRecord(
  analysis: DeliveryAnalysisResult,
  questionIndex?: number,
): DeliveryAnswerRecord {
  return {
    wordCount: analysis.wordCount,
    estimatedDurationSeconds: analysis.estimatedDurationSeconds,
    wordsPerMinute: analysis.wordsPerMinute,
    fillerWordCount: analysis.fillerWordCount,
    hedgingPhraseCount: analysis.hedgingPhraseCount,
    longPauseCount: analysis.longPauseCount,
    answerTooShort: analysis.answerTooShort,
    answerTooLong: analysis.answerTooLong,
    questionIndex,
    recordedAt: new Date().toISOString(),
  };
}

export function mergeDeliveryIntoSessionInsights(
  existingInsights: Record<string, unknown> | null | undefined,
  newAnswers: DeliveryAnswerRecord[],
): Record<string, unknown> {
  const base =
    existingInsights && typeof existingInsights === "object" ? { ...existingInsights } : {};
  const prior = (base.deliveryMetrics as SessionDeliveryInsights | undefined)?.answers ?? [];
  const answers = [...prior, ...newAnswers];
  return {
    ...base,
    deliveryMetrics: {
      answers,
      aggregate: aggregateSessionDelivery(answers),
    } satisfies SessionDeliveryInsights,
  };
}

export function buildSummaryDeliverySection(
  delivery: SessionDeliveryInsights | null | undefined,
): string {
  if (!delivery?.answers?.length) return "";

  const lines = delivery.answers.map((a, i) => {
    const q = typeof a.questionIndex === "number" ? `Q${a.questionIndex + 1}` : `Answer ${i + 1}`;
    return `- ${q}: ${a.wordCount} words, ~${a.wordsPerMinute} WPM, ${a.estimatedDurationSeconds}s, fillers=${a.fillerWordCount}, hedging=${a.hedgingPhraseCount}, long_pauses=${a.longPauseCount}, too_short=${a.answerTooShort}, too_long=${a.answerTooLong}`;
  });

  const agg = delivery.aggregate;
  const aggLine = agg
    ? `\nSession averages: ~${agg.avgWordsPerMinute} WPM; ${agg.totalFillerWords} filler words; ${agg.totalHedgingPhrases} hedging phrases; ${agg.totalLongPauses} long pauses. Top delivery themes: ${agg.topSuggestions.join(", ") || "none"}.`
    : "";

  return `

Measured delivery signals (from transcript and speech timing only — NOT audio emotion analysis):
${lines.join("\n")}${aggLine}

When writing the report, comment on pace, filler words, hedging language, answer length, and pauses using these signals. Do NOT claim emotions, personality traits, or confidence levels you cannot support from text and timing. Avoid unsupported labels like "nervous" or "anxious" unless clearly evidenced by repeated hedging/fillers in the transcript itself.`;
}
