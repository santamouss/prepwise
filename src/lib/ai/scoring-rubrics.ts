/**
 * Strict scoring rubrics for behavioral and technical questions.
 * Applied consistently across all session evaluations (practice and recruiter).
 */

export const SCORING_RUBRICS = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           BEHAVIORAL QUESTION RUBRIC                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

1–2/10: BUZZWORDS ONLY
- No concrete example or story
- Only generic sentences: "I have good communication", "I work well under pressure", "I'm a team player"
- Does NOT answer the specific question asked
- One sentence cannot score above 3/10 under any circumstances

3–4/10: PARTIAL EXAMPLE
- Mentions a situation, but missing the candidate's specific action or the outcome
- "I once worked on a project" but doesn't explain what they personally did
- Vague about what went wrong or what the result was
- Still too generic to evaluate competency

5–6/10: INCOMPLETE STAR
- Has Situation + Action (what they did)
- BUT missing or weak Result/Outcome
- Result is vague: "things worked out" instead of measurable impact
- Not specific enough to evaluate impact or decision quality

7–8/10: COMPLETE AND SPECIFIC
- Clear STAR structure: Situation (context, company, project), Task (what went wrong/needed to happen)
- Action (what the candidate personally did — not "we" or "the team")
- Result (outcome with observable or measurable impact)
- Specific enough to evaluate how they think and act

9–10/10: EXCEPTIONAL
- Strong, concise story with all STAR elements
- Quantified or clearly observable impact
- Shows judgment, leadership, or problem-solving thinking
- Well-delivered and relevant to the question

HARD RULE FOR BEHAVIORAL:
Answers that are one sentence, generic, or missing Action/Result components cannot score above 3/10.
Do NOT score a buzzword answer at 5 or 6 even if it sounds confident or assertive.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                      TECHNICAL/SYSTEM DESIGN QUESTION RUBRIC                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

1–2/10: BUZZWORDS ONLY
- No architecture or concrete approach
- Only high-level buzzwords: "I'd use microservices", "I'd scale horizontally", "I'd cache it"
- No technology choices, no tradeoffs, no reasoning
- Does NOT demonstrate understanding

3–4/10: HIGH-LEVEL, NO DEPTH
- Mentions approach ("use a database" or "API") but no depth
- No technology choices or specific tools
- No tradeoffs considered
- No reasoning for decisions

5–6/10: REASONABLE APPROACH, MISSING KEY AREAS
- Reasonable high-level approach described
- BUT missing reliability, scaling, security, or key tradeoffs
- Some technology choices mentioned but not justified
- Gaps in thinking about edge cases or failure modes

7–8/10: CLEAR AND CONCRETE
- Specific architecture with concrete technology choices and why
- Tradeoffs explained (e.g., "I'd use PostgreSQL over MongoDB because...")
- Considers reliability, scaling, or security where relevant
- Shows systematic thinking about the problem

9–10/10: EXCEPTIONAL DEPTH
- Strong architecture with deep reasoning
- Edge cases and failure modes considered
- Tradeoffs explained and justified
- Shows mastery of the domain

HARD RULE FOR TECHNICAL:
Answers that are buzzwords only ("use microservices") cannot score above 2/10.
A high-level approach without reasoning or tradeoffs cannot score above 4/10.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                         WEAK ANSWER DETECTION                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Flag an answer as weak (score 1–4/10) if it exhibits ANY of:

STRUCTURAL ISSUES:
- One sentence only
- Generic or buzzword-heavy without examples
- Missing the candidate's personal action (contains "we", "the team", or no clear "I")
- Missing outcome or result
- Missing situation or context
- Not answering the specific question asked

CONTENT ISSUES:
- Vague: no specific company, project, person, or measurable impact named
- Circular: repeats the question back without answering it
- Irrelevant: doesn't connect to the question asked
- Over-confident but empty: sounds assertive but has no substance

WHEN AN ANSWER IS WEAK:
- Score it low (1–4/10 based on rubric)
- Explicitly state what is missing: "too vague", "too generic", "missing the outcome"
- Never praise weak answers ("good job", "strong answer", "great start")
- Explain specifically what would improve it
- Offer a structure or example of what a complete answer looks like


╔═══════════════════════════════════════════════════════════════════════════════╗
║                    BEHAVIORAL ANSWER COMPLETENESS CHECKLIST                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

A complete behavioral answer requires:

✓ SITUATION: What was the context? What company, project, or team?
✓ TASK: What problem or challenge came up? What specifically went wrong?
✓ ACTION: What did the candidate personally do? (Use "I", not "we")
✓ RESULT: What was the outcome? What changed or improved?
✓ IMPACT: How was it measured? What was the observable or measurable effect?

If ANY of these are missing, the answer is incomplete and must be scored 1–6/10.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                    TECHNICAL ANSWER COMPLETENESS CHECKLIST                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

A complete technical answer requires:

✓ CONCRETE ARCHITECTURE: Not just "use microservices" but actual architecture decisions
✓ TECHNOLOGY CHOICES: Specific tools, languages, or frameworks with why
✓ TRADEOFFS: What you're optimizing for (speed? cost? reliability?) and what you're trading off
✓ RELIABILITY/SCALING/SECURITY: Consideration of key non-functional requirements
✓ REASONING: Why these decisions, not just what the decisions are

If any of these are missing, the answer is incomplete and must be scored 1–6/10.


╔═══════════════════════════════════════════════════════════════════════════════╗
║                            COACHING TONE EXAMPLES                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

WEAK ANSWER EXAMPLE:
Question: "How did you handle unexpected issues or delays, especially if the data sync
wasn't going as planned?"

Weak answer: "I have good communication and working with cross-functional teams."

CORRECT COACHING RESPONSE (Direct but Encouraging):
"That scores around 2/10 because it's too generic to evaluate. You mentioned communication
and cross-functional work, but you didn't explain what the actual sync issue was, what you
personally did to address it, or what the outcome was. To improve this answer, describe a
specific situation: What was the sync issue? Who was affected? How did you communicate?
What did you do to fix it? What was the result? An answer like that would score 7 or 8.
Try again with a real example."

TONE GUIDELINES:
✓ Direct: Name what's missing ("too vague", "missing the outcome", "no concrete example")
✓ Encouraging: "Try again with a real example" (not "you can do better")
✓ Specific: Say what to add ("What was the sync issue? Who was affected?")
✓ Actionable: Offer structure or example ("Try adding: 'As a result, we reduced latency by 40%'")

NEVER USE:
✗ "You did a poor job"
✗ "That was a bad answer"
✗ "You clearly don't understand this"
✗ "That doesn't make sense"
(Attack the answer, not the person.)


╔═══════════════════════════════════════════════════════════════════════════════╗
║                         APPLICATION IN PRACTICE                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Apply these rubrics to:
1. Live Coach Mode feedback (spoken during session)
2. Final report question evaluations (written)
3. Overall session summary and score
4. All question types (behavioral, technical, product, case, etc.)

Do NOT change scoring standards between practice and recruiter sessions.
The candidate experience and the hiring evaluation should both use the same strict standards.
`;

export const WEAK_ANSWER_COACHING_TEMPLATE = `
You are evaluating a WEAK answer. Apply the following template:

1. SCORE (concise): "That scores around X/10 because..."
   - Specific reason: too vague, too generic, missing action, missing outcome, not answering the question

2. WHAT'S MISSING (direct): "You mentioned [what they said], but you didn't explain [what's missing]"
   - Example: "You mentioned communication, but you didn't explain what the issue was or how you fixed it"

3. STRUCTURE (offer frame): For behavioral: "Give me a specific example: What was the [situation]?
   What did you personally do? What was the result?"
   For technical: "Explain your approach: What technology would you use and why? What tradeoffs are involved?"

4. EXAMPLE (one strong sentence): "For example, you could say: '[strong example sentence]'"
   OR "Try adding a sentence like: '[what to add]'"

5. RETRY INSTRUCTION: "Use the Try Again button to retry this question with a specific example."

TEMPLATE (voice/spoken):
"That scores around a 2/10 because it's too generic. You mentioned [X], but you didn't explain
[what's missing]. To improve it, describe a specific [situation/project]: [guide questions].
For example, you could say: '[example]'. Give it another try."

TEMPLATE (written/report):
"Score: 2/10. This answer is too vague to evaluate. It lacks [specific missing element].
To strengthen this response: [what to add]. A stronger answer would include: '[example]'."
`;

export const GENERIC_BUZZWORD_EXAMPLES = [
  "I have good communication",
  "I work well under pressure",
  "I'm a team player",
  "I'm a problem solver",
  "I have strong interpersonal skills",
  "I'm results-oriented",
  "I work well with others",
  "I'm a fast learner",
  "I'm detail-oriented",
  "I take initiative",
  "I like challenges",
  "I enjoy mentoring",
  "I have good time management",
  "I'm flexible and adaptable",
];

export function isAnswerTooVague(answer: string): boolean {
  const trimmed = answer.trim();

  // Single sentence (one period, no multi-clause structure)
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 1) {
    return true;
  }

  // Check for generic buzzwords without concrete details
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 20) {
    // Very short answers are likely too vague
    return !hasConcreteDetails(trimmed);
  }

  // Check if answer contains specific company, project, or person names
  const hasSpecifics = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|\d+%|\$\d+|[a-z_]+\.[a-z]+/.test(trimmed);
  if (!hasSpecifics && wordCount < 50) {
    return true;
  }

  return false;
}

function hasConcreteDetails(text: string): boolean {
  // Look for: specific names, numbers, percentages, technical terms, past tense (what they did)
  const hasNumbers = /\d+/.test(text);
  const hasSpecificAction = /\b(led|built|created|designed|implemented|fixed|optimized|reduced|increased|improved)\b/i.test(text);
  const hasMetric = /\b(percent|%|\$|million|thousand|users|queries|latency|throughput)\b/i.test(text);

  return hasNumbers || hasSpecificAction || hasMetric;
}
