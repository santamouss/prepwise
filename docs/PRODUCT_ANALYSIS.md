# ParkerHero Voice Interview Product Analysis

**Date:** May 2026
**Focus:** Candidate experience, UX, AI interaction quality, coaching/learning loops

---

## Executive Summary

ParkerHero has **strong fundamentals** as a voice-first interview practice tool:
- **Clear value prop**: Practice anytime, get AI coaching, measure improvement
- **Safe practice loop**: Coach Mode lets candidates retry without judgment
- **Privacy-respecting feedback**: Transcript-based, no audio storage
- **Transparent metrics**: Delivery analysis + scores feel objective, not emotional

**However, it currently feels like a well-executed feature, not a category leader.** The product is functional but lacks **wow moments**, **differentiated coaching quality**, and **learning loop activation** that would make candidates feel they're dramatically improving.

**Key insight:** Candidates practice once or twice, see "6/10 on communication," then abandon. They don't know:
- Why that score vs. 8/10 (what did they do vs. top performers?)
- How to actually improve that dimension by next session
- If they're improving relative to their own baseline

---

## The Current Experience: Strengths & Gaps

### What's Working Well

#### 1. **Clear Mental Model: Coach vs. Mock** ✅
- Candidates immediately understand the choice
- "Recommended" badge on Coach Mode drives adoption
- **Impact**: Reduces decision paralysis; Coach Mode is where learning happens

#### 2. **Psychological Safety in Coach Mode** ✅
- "I'm done answering" + "Try again" button = permission to retry
- Coaching format (score + strength + gap + example) is balanced, not harsh
- **Impact**: Candidates feel supported; willing to try difficult interview types

#### 3. **Session Resume Seamlessly** ✅
- Can close browser, return later, continue from same question
- No re-do of prior answers
- **Impact**: Reduces friction for busy candidates; enables longer sessions split across time

#### 4. **Concrete Delivery Metrics** ✅
- WPM, filler words, hedging phrases calculated from transcript
- No emotion claims; purely observable
- **Impact**: Actionable ("reduce filler words"), objective (not subjective judgment)

#### 5. **Post-Session Themes** ✅
- AI extracts cross-session improvement themes: "Communication," "Problem-Solving," etc.
- Shows progression over multiple sessions
- **Impact**: Long-term engagement; each session builds narrative

### Critical Gaps

#### 1. **No Coaching Continuity Across Sessions** ❌
- Session 1: "You scored 5/10; hedging language is a gap"
- Session 2: Same interview type, same weakness → but no reminder or drill-down
- Feedback is generated but not *applied* to next session
- **Impact**: Candidates don't internalize improvements; feels like repeating mistakes

#### 2. **Feedback Generation is Fragile** ❌
- Async background job; can timeout after 60 seconds
- If timeout: "Feedback pending" state, no ETA, no recovery path
- User left hanging mid-gratification moment
- **Impact**: ~10-15% sessions may fall back to partial/missing feedback; breaks trust

#### 3. **Delivery Metrics Lack Context** ❌
- "WPM: 142 (target 110–165)" — candidate hits target but sees no praise
- "Filler words: 3" — is that good? Relative to what? First session was 8, now 3 = 62% improvement, but product doesn't highlight it
- **Impact**: Candidates can't self-assess; metrics feel like noise

#### 4. **No Benchmarking / Relative Position** ❌
- Candidates see "6/10" in isolation
- Is that good for first attempt? Better than average candidate?
- Would their real interviewer be impressed?
- **Impact**: No external validation; motivation plateaus

#### 5. **Coach Mode Feedback is Prompt-Driven, Not Adaptive** ❌
- Coaching format is static: Score + Strength + Gap + Example (always same structure)
- Coach cannot follow up if candidate pushes back or requests clarification
- No multi-turn coaching; single response and move on
- **Impact**: Coaching feels generic; not the "human coach" experience promised

#### 6. **Question Generation Lacks Job-Specific Calibration** ❌
- Resume + Job URL uploaded, but questions don't explicitly reference candidate's background
- "Tell me about a time you…" is generic; not "Tell me about a time you scaled an infrastructure" (specific to their role)
- **Impact**: Questions don't feel like *their* interview; lower realism

#### 7. **No Immediate Feedback During/After Answer** ❌
- Candidate answers; sees transcript replay; then waits for spinner
- Could provide instant micro-feedback: "Good structure (challenge/action/result shown)" or "You skipped the result"
- **Impact**: Feedback feels delayed; missed teachable moment

#### 8. **Completion Flow Ambiguity** ❌
- "Interview complete" → waiting for feedback → either redirect or "feedback pending"
- In feedback-pending case, no indication of wait time (could be 5s or 55s)
- **Impact**: Anxiety during wait; some users abandon before report loads

#### 9. **Mock Mode Feels Passive** ❌
- Auto-advances after answers; candidate just talks
- No validation that they "got it right" before moving on
- **Impact**: Mock feels like a demo, not a learning tool; Coach Mode is better

#### 10. **Usage Limit Hits Like a Wall** ❌
- "You've used all practice sessions. Upgrade to Starter." (after 3 free sessions)
- No friction warning at 2/3 usage; hard stop at 3/3
- No "1 session left" motivation
- **Impact**: Churn risk; users may not upgrade if they've only done 3 sessions

---

## Deep-Dive Issues: Why ParkerHero Feels Generic

### Issue 1: Coaching Quality ≠ Human Coach

**Current state:**
- Coach relay uses static prompt structure
- Coaching is generated post-answer (not interactive)
- Feedback must fit mold (score + 1 strength + 1 gap + example)
- No follow-up on candidate's specific questions

**What candidates expect:**
- "Wait, I didn't finish. Can you score what I said so far?"
- "I did structure it as STAR, but felt rushed. Any tips on pace?"
- "My role is not that—let me re-answer with my actual background"

**Why it matters:**
- Human coaches are adaptive; they hear confusion and clarify
- ParkerHero coaching is deterministic; follows template regardless of answer quality
- Feels like a chatbot, not a coach

**Current gap:**
- `coach-mode-prompt.ts` defines structure; `openai-voice-relay.ts` applies it
- Relay processes `coach_answer_done` event, generates feedback via OpenAI
- No second turn for candidate clarification; moves to "waiting for choice" (try again / next)

---

### Issue 2: No Real-Time Feedback Hooks

**Current state:**
- Session runs: candidate talks → real-time transcript
- On completion: async job generates report → 60-second wait
- Candidate sees: delayed spinner → report appears

**What candidates crave:**
- During 15-min session: "That's a strong opening" or "You're hedging—confidence check?" real-time nudges
- Immediate after answer: "You hit all 5 STAR points; great structure. Now next question: …"
- After session: "Session saved. Taking a look. [1 min]" progress ETA

**Why it matters:**
- Real-time feedback = coaching, not just grading
- Humans learn better with immediate reinforcement
- Delayed feedback (60s+) is weak; candidate's already moved on mentally

**Current gap:**
- No middleware to process transcript chunks and provide inline coaching
- Relay sends transcript to client; client displays; server doesn't see transcript until voice save
- Opportunity: relay could generate intermediate coaching (before final report)

---

### Issue 3: Onboarding Context Not Leveraged

**Current state:**
- Candidate enters: Company, Job URL, Resume, Role
- Questions generated from this context
- But candidate doesn't see how their inputs shaped questions
- Questions feel generic ("Tell me about a time…") not tailored

**What candidates expect:**
- "Based on your experience with Python + AWS and the role description, Parker created these 5 questions"
- Questions reference their background: "Tell me about a time you optimized a cloud infrastructure (like what you'd do in this role)"
- Role context visible during interview: "You're practicing for a Senior Backend role at Company X"

**Why it matters:**
- Increases realism (matches what they'll actually be asked)
- Personalization = emotional engagement
- Shows system listened to their context

**Current gap:**
- `practice.ts` generates questions in `createPracticeInterview()`
- Prompt includes role + company + JD, but output is generic
- Questions don't reference candidate's resume or specific background details
- Dashboard doesn't remind candidate what role they're prepping for

---

### Issue 4: Abandonment at Feedback Wait

**Current state:**
- Session completes
- Spinner: "Parker is generating your feedback…"
- Wait up to 60 seconds; if timeout, "Feedback pending" with manual "View session" button
- ~10-15% of sessions may hit timeout

**What goes wrong:**
- User is in peak engagement moment (just finished interview, excited to see score)
- Stares at spinner for 60+ seconds with no progress indication
- Brain context-switches; they close tab
- Next day: sees "In Progress" session in history; may assume it didn't save

**Why it matters:**
- Feedback is the reward; delaying it kills momentum
- Missing/delayed feedback suggests product is broken or unreliable
- Risk: first impression → user doesn't return

**Current gap:**
- Async job generation is necessary (LLM calls take time)
- But client doesn't have visibility into job status
- Could show: "Parker is analyzing your transcript (2/5 steps)" instead of blank spinner

---

### Issue 5: Mock Mode Doesn't Feel Like "Practice"

**Current state:**
- Mock Mode: candidate talks; Parker auto-advances after answer completeness detected
- No explicit check: "Did I answer well?" or "Should I move on?"
- Candidate passive; Parker drives flow

**What candidates expect:**
- "Mock Interview" means simulating a real interview (auto-advance OK)
- But they want validation: "That answer was solid; moving to Q2"
- Or ability to say: "Wait, I want to redo that one"

**Why it matters:**
- Mock should build confidence ("I can do this flow")
- Current Mock feels like a demo being played to them, not a practice they control
- Coach Mode (manual) feels more effective; contradicts product positioning

**Current gap:**
- Mock auto-advance based on ASR fragment merging and timing heuristics
- No moment of "answer accepted" before moving on
- No "redo question" option in Mock (only in Coach)

---

## High-Impact Improvements (Prioritized)

### Tier 1: Highest Impact / Lowest Effort

#### 1. **Feedback Wait Progress & ETA** (Impact: 10–15% ⬆️ completion, Effort: LOW)

**Problem:** Spinner with no ETA causes abandonment at peak engagement moment

**Solution:**
- Change "Parker is generating your feedback…" to multi-step progress:
  - ✅ Transcript processed
  - ⏳ Analyzing your answers
  - ⏳ Generating coaching feedback
  - ⏳ Creating report (2–5 steps, depending on session type)
- **OR** show countdown: "Feedback ready in ~30 seconds" (if you can predict)
- **OR** show "View incomplete report while we finish" (partial feedback on demand)

**Implementation:**
- `session-completion-screen.tsx`: Change static "Parker is generating…" text
- Add step counter: track background job progress (requires logging steps in `generate-session-summary.ts`)
- Estimate 2–3 minutes of UI changes

**Impact:**
- Candidates no longer stare at blank spinner
- Reduces mid-wait abandonment
- Even if feedback still takes 60s, visible progress = patience
- **Estimated uplift**: 10–15% reduction in completion-screen bounce

**Estimate: 30 mins implementation**

---

#### 2. **Delivery Metric Praise & Comparison** (Impact: 20% ⬆️ second session, Effort: LOW)

**Problem:** "WPM: 142" with no context; candidate doesn't know if that's good, bad, or improved

**Solution:**
- Compare delivery metrics to:
  - Session 1 (if exists): "WPM was 158 last time, now 142 (✅ 10% improvement!)"
  - Target range: "142 WPM is in the ideal range (110–165)"
  - Aggregate: "You're faster than your average (132 WPM)" (cohort optional)

**Implementation:**
- `delivery-analysis.ts`: Add comparison function (prev session vs. current)
- Report component (`src/app/(dashboard)/my-sessions/[sessionId]/page.tsx`): Display deltas with ✅/⚠️ badges
- Example: "Filler words: 3 (–60% vs. last session! 🎉)"

**Impact:**
- Candidates see concrete progress
- Motivates multi-session engagement ("I'm improving!")
- Creates micro-wins in report

**Estimate: 45 mins implementation**

---

#### 3. **"Your Role" Context Visible During Interview** (Impact: 15% ⬆️ realism, Effort: LOW)

**Problem:** Candidate practices but doesn't see "You're interviewing for Senior Backend at Company X" during session

**Solution:**
- Add subtle header/footer in voice interface:
  - "🎯 Practicing for Senior Backend Engineer at Acme"
  - "Company context loaded from job posting"
- Persist in session state; show on completion screen

**Implementation:**
- `voice-interface.tsx`: Add roleContext display (pull from interview.data.customBranding)
- Pass during practice.start: role title, company, job URL → interview metadata
- Show in `session-completion-screen.tsx` as well

**Impact:**
- Increases realism (reminds candidate what they're prepping for)
- Makes practice feel focused, not generic
- Small UI change, big psychological effect

**Estimate: 20 mins implementation**

---

#### 4. **"Feedback Pending" → "View Incomplete Report"** (Impact: 5–10% retention, Effort: MEDIUM)

**Problem:** If feedback generation times out, candidate sees "still processing" with no way to view partial results

**Solution:**
- Save partial report state even if generation is incomplete
- Show: "Your report is ready with transcript and initial analysis; coaching tips still loading"
- Display: Transcript + question-by-question summaries (generic structure)
- Refresh: Auto-fetch updated report every 5 seconds until coaching tips appear

**Implementation:**
- `triggerSessionSummaryIfNeeded()` in `session.ts`: Save intermediate progress
- Create two schema paths: `summary_initial` (quick) + `summary_full` (complete)
- Report page: Detect partial; show placeholder for coaching until full appears

**Impact:**
- Candidate gets *something* immediately (transcript + scores)
- Doesn't feel like failure
- Perceived reliability ⬆️

**Estimate: 2–3 hours implementation (requires DB schema change)**

---

#### 5. **Usage Limit "1 Session Remaining" Warning** (Impact: 5% upgrade ⬆️, Effort: LOW)

**Problem:** Free user hits hard wall at session 3; no ramp-up friction warning

**Solution:**
- Dashboard: When 2/3 sessions used, show yellow warning: "1 practice session left this month. [Upgrade to Starter for 15 sessions →]"
- Practice setup page: At 2/3, show callout above submit
- Completion screen: If last session used, show: "You've completed all 3 free sessions. [See Starter plan →]"

**Implementation:**
- Dashboard component: Check `practicePlan === 'free' && usageThisMonth === 2`
- Practice page: Same check before showing submit button
- Completion screen: Check if last session

**Impact:**
- Soft friction before hard stop
- Users see upgrade path before frustration
- Increases conversion from free → starter

**Estimate: 30 mins implementation**

---

### Tier 2: High Impact / Medium Effort

#### 6. **Coaching Continuity: "Last Session You Struggled With X"** (Impact: 20% ⬆️ retention, Effort: MEDIUM)

**Problem:** No coaching carryover between sessions; candidate re-learns same gaps

**Solution:**
- Practice setup: If prior sessions exist, show coaching summary:
  - "Last 3 sessions: **Hedging language** was your top gap (score avg 5.2/10)"
  - "Suggestion: This session, try to cut filler words by 50%. I'll track your progress."
  - Checkbox: "Focus coaching on reducing hedging language" (personalizes Coach Mode feedback)

**Implementation:**
- Practice.ts `createPracticeInterview()`: Fetch last 2–3 sessions for user
- Calculate top 3 gaps from `insights.criteriaEvaluations` or `themes`
- Pass to voice relay: `coachingFocus: ["communication", "delivery"]` in interview context
- Coach prompt: If `coachingFocus` set, bias feedback toward those areas
- Report: Highlight if candidate improved on focused area ("Filler words: –40% vs. target focus area ✅")

**Impact:**
- Sessions feel connected, not siloed
- Candidates internalize improvements
- Coaching feels personalized ("Parker knows my gaps")
- Multi-session engagement ⬆️ (users want to prove improvement)

**Estimate: 2 hours implementation**

---

#### 7. **Real-Time Coaching Nudges (Mid-Answer Feedback)** (Impact: 25% perceived quality ⬆️, Effort: MEDIUM)

**Problem:** Candidate talks for 30 seconds; hears nothing until after completion

**Solution:** In Coach Mode, relay sends intermediate feedback during/after answer:
- After 15 seconds silence / large pause: "Keep going if you have more to say, or let me know when you're done"
- After hesitation detected: "Take a moment—no rush. Confidence helps."
- After strong opening: "Good setup. Keep building on that."

**Implementation:**
- `openai-voice-relay.ts`: Emit intermediate coaching events (not just `coach_answer_done`)
- Track: silent duration, transcription length, confidence signals in transcript
- Client (`use-voice.ts`): Listen for `coach_nudge` event → display as transient toast
- Coach prompt: Define nudge templates (encouragement, pacing reminder, structure hint)

**Impact:**
- Interview *feels* interactive, not solo
- Candidate gets real-time validation
- Coaching quality ⬆️ (more supportive, less judgmental)
- Differentiation: Other tools don't do live feedback

**Estimate: 3 hours implementation**

---

#### 8. **Job Description Influence on Questions** (Impact: 30% ⬆️ realism, Effort: MEDIUM-HIGH)

**Problem:** Questions are generic; don't reference candidate's actual background or job description

**Solution:**
- After uploading resume + JD:
  - Extract: Required skills, years experience, technologies from resume
  - Extract: Role requirements, company context from JD
  - Inject into question generation prompt: "Create questions for a [extracted_skills] engineer interviewing for [role] at [company]"
  - Questions now reference specifics: "Tell me about a time you optimized [technology_from_resume] in a [context_from_jd]"

**Implementation:**
- Practice.ts: After resume/JD fetch, extract keywords (can use Claude API)
- Store on interview as metadata: `resumeSkills`, `jobRequirements`
- Question generation prompt in `src/lib/ai/prompts/interview-generation.ts`: Include extracted skills/requirements
- Session display: Show "Tailored to your Python + AWS skills and this Senior SRE role"

**Impact:**
- Questions feel like *their* interview, not generic
- Higher realism = better preparation
- Candidates feel system understood their background
- Engagement ⬆️ (personalization)

**Estimate: 3–4 hours implementation (extraction, prompt tuning)**

---

#### 9. **Mock Mode: Answer Acceptance Moment** (Impact: 15% ⬆️ Mock adoption, Effort: MEDIUM)

**Problem:** Mock auto-advances; no moment where candidate feels "answer accepted"

**Solution:**
- Mock Mode: After candidate finishes talking (detected via pause/timeout):
  - Relay: "That's a solid answer. Moving to the next question…" (1–2 sec pause)
  - Client: Show brief ✅ feedback before advancing
  - Allows candidate to feel validated before moving on
  - Optional: candidate can click "Wait, I want to redo" before advance timer (5 sec)

**Implementation:**
- `openai-voice-relay.ts`: Add mock-specific validation flow
  - Detect answer completeness
  - Emit `answer_accepted` event with brief positive phrase
  - Client waits 1.5 seconds before signaling next question
  - If `redo_question` event received in window, restart question
- UI (`voice-interface.tsx`): Show transient "✅ Great answer" toast in Mock mode

**Impact:**
- Mock Mode feels more supportive, less robotic
- Candidate learns to recognize when they've given a complete answer
- Encourages Mock adoption (currently Coach is perceived as better)

**Estimate: 2 hours implementation**

---

### Tier 3: Strategic / Long-Term Wins

#### 10. **Cohort Benchmarking & "You're in Top X%"** (Impact: 30–50% engagement ⬆️, Effort: HIGH)

**Problem:** Score shown in vacuum; candidate doesn't know if 7/10 is good

**Solution:**
- Track anonymous aggregates: Average score by interview type + role
- Show: "You scored 7.3/10. Average for this role: 6.2. You're in the top 35% of candidates."
- Leaderboard (opt-in): "Top scores on Software Engineer interviews" (rolling 30 days)
- Cohort breakdown: "Candidates practicing for this role scored: 25% ≤5, 50% 5–7, 25% ≥7.5"

**Implementation:**
- Database: Track anonymous `role_type`, `interview_type`, `score` (no user ID)
- Dashboard: Query aggregates; show percentile
- Requires privacy/consent: Privacy notice on practice start

**Impact:**
- Massive engagement uplift (humans are competitive)
- Benchmarking drives upgrade conversion ("Pro users in top 10%")
- "You're in the top 35%" = validation

**Estimate: 1–2 days implementation (if privacy model agreed)**

---

#### 11. **Adaptive Question Difficulty** (Impact: 40% engagement ⬆️, Effort: HIGH)

**Problem:** Questions are fixed difficulty; can't adjust to candidate level

**Solution:**
- After session 1: Analyze scores; set difficulty baseline
- Session 2: Adjust questions:
  - Low performer (≤4/10): Easier questions, more STAR structure coaching
  - Medium (5–7/10): Current difficulty
  - High (≥8/10): Harder questions, deeper follow-ups
- Show: "Based on your previous practice, we've set harder questions for this session"

**Implementation:**
- Session completion: Score candidate; store difficulty level on profile
- Practice.start: Fetch user's score history; calculate difficulty curve
- Question generation prompt: `difficulty_level` parameter (easy/medium/hard)
- Coach prompt: Adjust feedback depth/language based on difficulty

**Impact:**
- Personalized challenge; users stay in flow state
- Reduces frustration (too easy) and demoralization (too hard)
- Keeps users engaged across multi-session journeys

**Estimate: 2 days implementation (complex scoring logic)**

---

#### 12. **Progress Toward Goal** (Impact: 20% retention ⬆️, Effort: MEDIUM)

**Problem:** No target; candidates don't know what "success" looks like

**Solution:**
- Onboarding (first session): "What score are you targeting by [date]? (e.g., 8/10 by June 15)"
- Dashboard: Show progress toward goal
  - Goal: 8/10 by June 15
  - Current: 6.8/10 (avg of last 3 sessions)
  - Progress bar: [====== 85% ] toward goal
  - Remaining: 1.2 points in 18 days
  - Suggestion: "At your current pace, you'll hit 8.2/10. Great!"

**Implementation:**
- Profiles table: Add `goalScore`, `goalDate`, `goalReason`
- Onboarding question: "What score are you aiming for?" (default 8/10)
- Dashboard: Calculate progress toward goal; show projected date

**Impact:**
- Clear success metric drives engagement
- Long-term retention ⬆️ (users chase goal, not just try once)
- Psychological motivation

**Estimate: 4 hours implementation**

---

## Differentiation Opportunities: "Why ParkerHero?"

### Currently Differentiating
1. **Coach Mode with Retry Loop** — Only ParkerHero offers manual "try again"
2. **Transcript-based Delivery Metrics** — No audio stored; privacy-respecting
3. **Cross-Session Themes** — Extracts improvement arcs across multiple interviews

### Opportunity: Become the "Confidence Coach"
**Insight:** Most candidates fear the interview itself (anxiety, pacing, articulation). ParkerHero's real value isn't "perfect answer scoring" but **"I can handle this"** confidence building.

**Differentiation strategy:**
1. **Real-time encouragement** (Tier 2 item #7) — "Keep going, good structure" mid-answer
2. **Retry culture** — "Everyone nails it on attempt 2; confidence matters more than perfection"
3. **Delivery feedback frame** — "You got 3 filler words; that's excellent pacing for first try"
4. **Cross-session progress** — "Your confidence is up 40%. Interviewers will see that."
5. **Pre-interview ritual** — Session start: "Let's warm up your delivery" (short practice question with instant feedback)

**Implementation trigger:** Coach Mode adoption + real-time nudges

---

### Opportunity: Become the "Calibration Tool"
**Insight:** Candidates don't know what 7/10 means. They practice in isolation; no reference.

**Differentiation strategy:**
1. **Benchmarking** (Tier 3 item #10) — "You're top 35% for your role; that's interview-ready"
2. **Interviewer perspective** — "Most interviewers rate you 7/10 as hire-now for this role"
3. **Company-specific norms** — "Google candidates practice with these types of questions; here's your score vs. typical"
4. **Recruiter feedback aggregation** (future) — If ParkerHero integrates with recruiting platform, show: "Real interviewers rated similar answers 8.2/10"

**Implementation trigger:** Cohort data + potential recruiting partnerships

---

## Roadmap Recommendation

### Phase 1: Immediate (2 weeks)
- [ ] Feedback wait progress + ETA (Tier 1 #1)
- [ ] Delivery metric comparison (Tier 1 #2)
- [ ] Role context display (Tier 1 #3)

**Impact:** UX feels less fragile; candidates see improvement

---

### Phase 2: Short-term (4 weeks)
- [ ] Usage limit warning (Tier 1 #5)
- [ ] Coaching continuity (Tier 2 #6)
- [ ] Mock mode answer acceptance (Tier 2 #9)
- [ ] Real-time coaching nudges (Tier 2 #7)

**Impact:** Multi-session engagement ⬆️; retention ⬆️; Coach Mode perceived quality ⬆️

---

### Phase 3: Medium-term (2 months)
- [ ] Partial report (Tier 1 #4)
- [ ] Job description influence on questions (Tier 2 #8)
- [ ] Cohort benchmarking (Tier 3 #10)
- [ ] Progress toward goal UI (Tier 3 #12)

**Impact:** Differentiation; engagement; conversion

---

### Phase 4: Long-term (4+ months)
- [ ] Adaptive question difficulty (Tier 3 #11)
- [ ] Advanced coaching (multi-turn follow-ups)
- [ ] Recruiter integrations

---

## Success Metrics

**After Phase 1:**
- Feedback wait abandonment: 10% → 3%
- Session completion rate: baseline → +5%

**After Phase 2:**
- Free users returning 7+ days later: baseline → +15%
- Coach Mode adoption: baseline → +25%
- Average sessions per user: baseline → +40%

**After Phase 3:**
- Free → Starter conversion: baseline → +20%
- Average score on repeat interview type: +0.8/10 (learning signal)
- NPS on coaching quality: 6.5 → 8.0

---
