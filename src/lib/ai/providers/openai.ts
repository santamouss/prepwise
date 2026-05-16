import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { type LLMProvider, type GenerationParams, type LLMResponse, type LLMMessage } from "../types";

export function usesMaxCompletionTokens(model: string): boolean {
  const normalized = model.toLowerCase();
  return (
    normalized.startsWith("gpt-5") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  );
}

export function isGpt5Model(model: string): boolean {
  return model.toLowerCase().startsWith("gpt-5");
}

function buildTokenLimitParams(
  model: string,
  maxTokens: number,
): Pick<ChatCompletionCreateParamsNonStreaming, "max_tokens" | "max_completion_tokens"> {
  if (usesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

export function buildTemperatureParams(
  model: string,
  temperature?: number,
): Pick<ChatCompletionCreateParamsNonStreaming, "temperature"> | Record<string, never> {
  if (isGpt5Model(model)) {
    if (temperature === 1) {
      return { temperature: 1 };
    }
    return {};
  }

  if (temperature === undefined) {
    return { temperature: 0.7 };
  }

  return { temperature };
}

function buildCompatibilityParams(
  model: string,
  options: { maxTokens: number; temperature?: number },
): Pick<ChatCompletionCreateParamsNonStreaming, "max_tokens" | "max_completion_tokens" | "temperature"> {
  return {
    ...buildTokenLimitParams(model, options.maxTokens),
    ...buildTemperatureParams(model, options.temperature),
  };
}

export class OpenAIProvider implements LLMProvider {
  id = "openai";
  name = "OpenAI";
  models = [
    "gpt-5",
    "gpt-5-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "o3-mini",
    "o4-mini",
  ];
  defaultModel =
    process.env.OPENAI_CHAT_INTERVIEW_MODEL?.trim() || "gpt-4o-mini";

  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }

  private toOpenAIMessages(messages: LLMMessage[]): ChatCompletionMessageParam[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content as string & Array<unknown>,
    })) as ChatCompletionMessageParam[];
  }

  async generateResponse(
    params: GenerationParams & { model?: string }
  ): Promise<LLMResponse> {
    const model = params.model ?? this.defaultModel;
    const maxTokens = params.maxTokens ?? 2048;
    const response = await this.client.chat.completions.create({
      model,
      messages: this.toOpenAIMessages(params.messages),
      ...buildCompatibilityParams(model, {
        maxTokens,
        temperature: params.temperature,
      }),
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? "",
      finishReason: choice.finish_reason ?? "stop",
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *streamResponse(
    params: GenerationParams & { model?: string }
  ): AsyncIterable<string> {
    const model = params.model ?? this.defaultModel;
    const maxTokens = params.maxTokens ?? 2048;
    const stream = await this.client.chat.completions.create({
      model,
      messages: this.toOpenAIMessages(params.messages),
      ...buildCompatibilityParams(model, {
        maxTokens,
        temperature: params.temperature,
      }),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
