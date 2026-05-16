import { type LLMProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { KimiProvider } from "./providers/kimi";
import { MinimaxProvider } from "./providers/minimax";

const providers = new Map<string, LLMProvider>();

function registerProvider(provider: LLMProvider) {
  providers.set(provider.id, provider);
}

function openAiModel(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

registerProvider(new OpenAIProvider());
registerProvider(new KimiProvider());
registerProvider(new MinimaxProvider());

/** Resolve the right provider for a given model name or provider id. */
export function getProvider(idOrModel?: string | null): LLMProvider {
  if (idOrModel) {
    if (providers.has(idOrModel)) return providers.get(idOrModel)!;
    const allProviders = Array.from(providers.values());
    for (const p of allProviders) {
      if (p.models.some((m: string) => m.toLowerCase() === idOrModel.toLowerCase())) {
        return p;
      }
    }
  }
  // Default fallback order: openai → kimi → minimax
  if (process.env.OPENAI_API_KEY) return providers.get("openai")!;
  if (process.env.KIMI_API_KEY) return providers.get("kimi")!;
  if (process.env.MINIMAX_API_KEY) return providers.get("minimax")!;
  throw new Error("No LLM provider configured. Set OPENAI_API_KEY, KIMI_API_KEY, or MINIMAX_API_KEY.");
}

export function listProviders(): LLMProvider[] {
  return Array.from(providers.values());
}

/**
 * Model used for post-interview report generation.
 * Falls back through available providers.
 */
export const REPORT_MODEL = process.env.OPENAI_API_KEY
  ? openAiModel("OPENAI_REPORT_ANALYSIS_MODEL", "gpt-4o")
  : process.env.KIMI_API_KEY
    ? "kimi-k2.5"
    : "MiniMax-M2.1-lightning";

/** Model used for interview generation from a description. */
export const INTERVIEW_GENERATION_MODEL = process.env.OPENAI_API_KEY
  ? openAiModel("OPENAI_INTERVIEW_GENERATION_MODEL", "gpt-4o-mini")
  : process.env.KIMI_API_KEY
    ? "moonshot-v1-8k"
    : "MiniMax-M2.1-lightning";

/** Model used for question refinement. */
export const QUESTION_REFINEMENT_MODEL = process.env.OPENAI_API_KEY
  ? openAiModel("OPENAI_QUESTION_REFINEMENT_MODEL", "gpt-4o-mini")
  : process.env.KIMI_API_KEY
    ? "moonshot-v1-8k"
    : "MiniMax-M2.1-lightning";

/** Default OpenAI model for live chat interviewing when interview.llmModel is unset. */
export const CHAT_INTERVIEW_MODEL = process.env.OPENAI_API_KEY
  ? openAiModel("OPENAI_CHAT_INTERVIEW_MODEL", "gpt-4o-mini")
  : undefined;

/** @deprecated Use INTERVIEW_GENERATION_MODEL */
export const GENERATOR_MODEL = INTERVIEW_GENERATION_MODEL;
