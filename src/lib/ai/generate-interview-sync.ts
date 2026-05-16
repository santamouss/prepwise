import { getProvider, GENERATOR_MODEL } from "@/lib/ai/registry";
import { buildGeneratorPrompt } from "@/lib/ai/prompts/generator";
import type { GeneratedInterview } from "@/lib/ai/types";

function parseJsonSafe(raw: string): GeneratedInterview {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
  try {
    return JSON.parse(jsonMatch[0]) as GeneratedInterview;
  } catch {
    let repaired = jsonMatch[0].replace(/,\s*$/, "");
    const opens =
      (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    const braces =
      (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < opens; i++) repaired += "]";
    for (let i = 0; i < braces; i++) repaired += "}";
    return JSON.parse(repaired) as GeneratedInterview;
  }
}

export async function generateInterviewFromDescription(
  description: string,
  options: {
    durationMinutes: number;
    language?: string;
    jobDescription?: string;
  },
): Promise<GeneratedInterview> {
  const provider = getProvider(GENERATOR_MODEL);
  const messages = buildGeneratorPrompt(
    description,
    options.durationMinutes,
    options.language ?? "en",
    options.jobDescription,
  );

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let fullContent = "";
      for await (const chunk of provider.streamResponse({
        messages,
        temperature: 0.7,
        maxTokens: 8192,
        model: GENERATOR_MODEL,
      })) {
        fullContent += chunk;
      }
      return parseJsonSafe(fullContent);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to generate interview");
}
