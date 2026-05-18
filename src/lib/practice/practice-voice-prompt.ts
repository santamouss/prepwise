export type PracticeVoiceQuestion = {
  text: string;
  type: string;
  description?: string | null;
  options?: { options: string[]; allowMultiple?: boolean } | null;
  order: number;
};

/** Spoken phrases Parker must not use in candidate practice voice sessions. */
export const PRACTICE_FORBIDDEN_SPOKEN_SCREEN_PHRASES = [
  "you'll see the problem on your screen",
  "read the prompt on your screen",
  "you'll see full details on screen",
  "see the problem on your screen",
  "read the problem on your screen",
  "read the problem on their screen",
] as const;

/** Recruiter/public interviews still reference on-screen coding tools. */
export const RECRUITER_CODING_SCREEN_CUE = "read the problem on their screen";

export function practiceVoicePromptReferencesScreen(text: string): boolean {
  const lower = text.toLowerCase();
  return PRACTICE_FORBIDDEN_SPOKEN_SCREEN_PHRASES.some((phrase) =>
    lower.includes(phrase),
  );
}

export function formatVoiceQuestionListEntry(
  q: PracticeVoiceQuestion,
  index: number,
  isPractice: boolean,
): string {
  let entry = `  ${index + 1}. [${q.type}] ${q.text}`;
  if (q.description) entry += `\n     Context: ${q.description}`;
  if (isPractice) return entry;

  if (q.options?.options?.length) {
    const labels = q.options.options
      .map((o, j) => `${String.fromCharCode(65 + j)}) ${o}`)
      .join(", ");
    const multi = q.options.allowMultiple ? " (multiple choice)" : " (single choice)";
    entry += `\n     Options${multi}: ${labels}`;
  }
  if (q.type === "CODING") {
    entry += `\n     Note: The participant has a code editor. You cannot see their code unless they describe it.`;
  }
  if (q.type === "WHITEBOARD") {
    entry += `\n     Note: The participant has a whiteboard. You will receive image updates silently — do NOT speak when you receive them. Only describe what you see when the participant asks you to look at it.`;
  }
  return entry;
}

export function buildPracticeVoiceQuestionList(
  questions: PracticeVoiceQuestion[],
  isPractice: boolean,
): string {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  return sorted
    .map((q, i) => formatVoiceQuestionListEntry(q, i, isPractice))
    .join("\n");
}

export const PRACTICE_EN_VERBAL_TECH_RULES = `## Candidate practice: voice-only questions
This is a candidate practice session. Every question is OPEN_ENDED and fully verbal.
- Ask the complete question and any necessary context out loud. The participant is not reading a hidden prompt.
- For technical or system-design topics, discuss architecture, tradeoffs, scalability, and reliability conversationally — like a real verbal interview.
- NEVER say phrases such as "You'll see the problem on your screen", "Read the prompt on your screen", "You'll see full details on screen", or anything implying on-screen problems, a code editor, or a whiteboard.
- Do not tell the participant to look at their screen for question details.`;

export const PRACTICE_ZH_VERBAL_TECH_RULES = `## 候选人练习：纯语音问题
这是候选人练习模式。所有问题均为开放式口语问题。
- 必须口头说出完整的问题和必要背景。参与者不会阅读隐藏的屏幕题目。
- 技术或系统设计类问题应像真实口语面试一样讨论架构、权衡、扩展性和可靠性。
- 绝不要说“请查看屏幕上的题目”“问题在屏幕上”等暗示屏幕题目、代码编辑器或白板的表述。
- 不要让参与者查看屏幕获取题目详情。`;

export const RECRUITER_EN_CODING_WHITEBOARD_RULES = `## Special Rules for Coding / Whiteboard Questions
When transitioning to a CODING or WHITEBOARD question:
- Do NOT read out the full question text! The question details are already displayed on the participant's screen. Just briefly say it's a coding/whiteboard question and ask them to read the problem on their screen and use the code editor/whiteboard.
- Keep your responses short — let the participant focus on thinking and coding/drawing.
- Categorize the participant's speech and respond accordingly:
  1. Talking TO YOU (asking questions, discussing approach) → Respond naturally
  2. Saying they're DONE ("I'm done", "finished") → Ask about their approach, time/space complexity, and possible improvements
  3. Thinking ALOUD (self-talk, "hmm", reading code) → Brief encouragement only (e.g. "Take your time")
  4. Wanting to SKIP ("I can't do this", "skip", "next question") → Brief encouragement, then call signal_question_change
  5. Discussion naturally CONCLUDED → Brief acknowledgement, then call signal_question_change`;

export const RECRUITER_EN_CODE_VISIBILITY_RULES = `## Code and Whiteboard Visibility
- You CAN see the participant's code and whiteboard! The system sends you real-time updates via [CODE_UPDATE] and [WHITEBOARD_UPDATE] messages containing their editor code and whiteboard images.
- When the participant asks "can you see my code?" or "look at what I wrote", answer YES and reference the latest code/whiteboard content you received.
- Do NOT proactively speak when you receive an update — only reference the content when the participant addresses you.`;

export function selectVoiceModeSections(isPractice: boolean, isZh: boolean): {
  codingOrPracticeRules: string;
  visibilityRules: string;
} {
  if (isPractice) {
    return {
      codingOrPracticeRules: isZh
        ? PRACTICE_ZH_VERBAL_TECH_RULES
        : PRACTICE_EN_VERBAL_TECH_RULES,
      visibilityRules: "",
    };
  }
  return {
    codingOrPracticeRules: isZh
      ? `## 编程题/白板题的特殊规则
当进入编程题或白板题时：
- 不要朗读完整的题目内容！题目详情已经显示在受访者的屏幕上。只需简短说明这是编程题/白板题，请他们查看屏幕上的题目并使用编辑器/白板。`
      : RECRUITER_EN_CODING_WHITEBOARD_RULES,
    visibilityRules: isZh
      ? `## 代码和白板可见性
- 你可以看到受访者的代码和白板内容！系统会通过 [CODE_UPDATE] 和 [WHITEBOARD_UPDATE] 消息将受访者编辑器中的代码和白板图片实时发送给你。
- 当受访者问你"能看到我的代码吗"或"看一下我写的"时，回答"是"并参考你收到的最新代码/白板内容。
- 不要在收到更新时主动开口——只在受访者和你说话时才提及。`
      : RECRUITER_EN_CODE_VISIBILITY_RULES,
  };
}
