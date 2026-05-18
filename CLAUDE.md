# Parker — Product Bible

> **Source of truth** for what Parker is, how it works, and where it is going.
> Update this file as product decisions are made. Use it as context for Cursor / Claude sessions.
>
> **Brand:** Customer-facing product is **Parker** (also **ParkerHero** in some deploy names, e.g. Fly app `parkerhero-voice`).
> **Repo / internal name:** PrepWise (`prepwise` in `package.json`). Fork of [Aural OSS](https://github.com/1146345502/aural-oss) (MIT).

---

## Product overview

**Parker** is a **voice-first AI interview practice** product for **job candidates**.

Candidates run mock interviews with Parker (AI interviewer/coach), get structured feedback and delivery metrics, and build confidence before real interviews.

**Core value prop:** Practice realistic voice interviews anytime, get instant AI feedback, improve delivery, land the job.

**Dual stack:** The codebase still contains the full **recruiter / hiring (Aural)** stack. That stack is **maintained and must not be broken**. B2C candidate practice is the **primary product focus**; B2B recruiter flows remain for invites, orgs, and future bootcamp/university licensing.

**Design:** Inter font, primary blue `#3B6FF0`, Otter-inspired SaaS UI (`src/app/globals.css`, `src/app/layout.tsx`).

---

## Current product state

### Shipped (candidate B2C)

| Area | Status |
|------|--------|
| User types (`candidate` / `recruiter`) | ✅ `profiles.user_type`, onboarding, route guards |
| Candidate dashboard, Practice, My Sessions, Progress | ✅ |
| Voice-first practice (Mock + Coach modes) | ✅ |
| OpenAI Realtime relay on Fly.io | ✅ |
| Practice checklist skip (metadata-based) | ✅ |
| JD paste, job URL fetch, resume PDF extract | ✅ |
| Session reports: summary, insights, scoring, themes | ✅ |
| Delivery feedback (transcript/timing, no raw audio) | ✅ |
| Monthly usage limits (`practicePlan`) | ✅ server-side |
| Post-interview completion + redirect to My Sessions report | ✅ |

### Not shipped yet

| Area | Status |
|------|--------|
| Public marketing / landing page | ❌ `/` redirects to `/dashboard` |
| Pricing page | ❌ |
| Stripe / billing | ❌ limits enforced in code only |
| Sprint Pass (one-time bundle) | ❌ discussed, not in codebase |
| Email notifications | ❌ partial Supabase templates only |

### Recruiter (Aural) stack

Still fully available: orgs, projects, interview templates, invites, public slugs, anti-cheating, video, `/interviews/*`, `/candidates`, API keys, etc. **Do not regress these flows when changing candidate practice.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel — Next.js 14 (App Router)                           │
│  UI, tRPC, API routes, Supabase client                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Supabase          OpenAI APIs      Fly.io (parkerhero-voice)
   Postgres +        (text LLM,       WebSocket relay:
   Auth + Storage    reports)         server/openai-voice-relay.ts
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind, shadcn/ui |
| API | tRPC (`src/server/routers/`) + Next.js API routes |
| Database | Supabase (PostgreSQL, Auth, Storage) |
| Text AI | OpenAI via `src/lib/ai/registry.ts` (task-specific models) |
| Voice | OpenAI Realtime API via custom WebSocket relay |
| Voice deploy | **Fly.io** — `fly.toml`, `Dockerfile.voice` |
| App deploy | **Vercel** (typical) |
| Legacy voice | Volcengine relay `server/voice-relay.ts` — **no Coach Mode support** |

**Deploy rule:** Relay / prompt / turn-taking changes → **Fly deploy**. UI / tRPC / API route changes → **Vercel deploy**. Version skew between the two is a known production risk.

---

## User types

Stored on `profiles.user_type`: `candidate` | `recruiter` (migration `006_add_user_type.sql`).

| Type | Dashboard | Route guard |
|------|-----------|-------------|
| **Candidate** | `CandidateDashboard` — `src/components/dashboard/candidate-dashboard.tsx` | Candidate-only paths in `src/lib/auth/user-type-routes.ts` |
| **Recruiter** | `RecruiterDashboard` (Aural metrics) | Recruiter-only prefixes: `/interviews`, `/candidates`, `/organizations`, etc. |

- **Onboarding:** `/onboarding` — *"How will you use Parker?"* → `trpc.user.setUserType` (`src/app/(dashboard)/onboarding/page.tsx`).
- **Layout enforcement:** `src/app/(dashboard)/layout.tsx` — redirects if `user_type` is null; blocks cross-persona routes.

Candidates still get a **hidden default org + project** (auto-created on `practice.start` in `src/server/routers/practice.ts`). Org UI is de-emphasized, not removed.

---

## Candidate experience

### Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Candidate stats, usage, recent sessions, CTA to Practice |
| `/practice` | Setup: role, company, type, duration, Mock vs Coach, JD, job URL, resume |
| `/my-sessions` | Practice history table |
| `/my-sessions/[sessionId]` | Report (`InterviewResults`) |
| `/progress` | Score trends, themes, improvement areas |
| `/onboarding` | Choose candidate vs recruiter (once) |
| `/i/[slug]/session?sid=...` | Live voice session (after practice start) |

Sidebar: `src/components/layout/sidebar.tsx`.

### Practice setup (`/practice`)

**Router:** `src/server/routers/practice.ts`

Creates a practice interview with:

- `isPractice: true`
- `voiceEnabled: true`, `videoEnabled: false`, `antiCheatingEnabled: false`
- `customBranding` includes `practiceMode`: `"mock"` | `"coach"` (`src/lib/practice/practice-mode.ts`)
- AI-generated questions from role + optional JD + resume context
- Redirect to `/i/{slug}/session?sid={sessionId}`

**Inputs:**

- Role, company, interview type (behavioral, role-specific, technical, sales, leadership)
- Duration (5 / 10 / 15 min → 3 / 5 / 7 questions)
- **Mock Interview** vs **Coach Mode**
- Job description paste
- Job posting URL → `/api/ai/extract-text` → `src/lib/practice/job-description-context.ts`
- Resume upload → PDF/text extraction

### Pre-session onboarding (checklist)

Full `IntervieweeOnboarding` (info → checklist → how it works) in `src/components/session/interviewee-onboarding.tsx`.

**Practice skip:** `src/lib/session/skip-practice-onboarding.ts` + `src/app/i/[slug]/session/page.tsx`

Skips entire onboarding when: `isPractice`, not preview, `!antiCheatingEnabled`, `!videoEnabled` (default for `practice.start`).

**Still shows checklist for:** recruiter public/invite sessions, preview, proctoring, video interviews.

**Caveat:** Skip is **metadata-based** (interview flags), not strictly auth-gated. Authenticated candidate is implied via practice start path only.

### Post-interview

- Completion UI: `src/components/session/session-completion-screen.tsx`
- Redirect plan: `src/lib/session/post-interview-redirect.ts` — practice → `/my-sessions/{sessionId}` when feedback ready
- Feedback readiness: `src/lib/session/session-has-feedback.ts`

---

## Recruiter experience (do not break)

Original Aural flow — keep working:

- Org → project → interview template → publish slug or invite token
- Candidate opens link, may complete full checklist (mic/camera/screen if enabled)
- Recruiter reviews `/interviews/[id]/results`, `/candidates`, video/anti-cheating when configured
- Session summary via `POST /api/ai/summarize` for recruiter-owned sessions
- Routes: `/interviews`, `/questions`, `/candidates`, `/organizations`, `/usage`, `/org/*`, `/projects`, `/settings/members`

Invite flow: `src/app/i/invite/`. Public slug: `src/app/i/[slug]/`.

---

## Voice system

### Data path

```
Browser — use-voice.ts
  → buildInitMessage (interviewContext + practiceMode)
  → RelayConnector — src/lib/voice/relay-routing.ts
  → Primary: OpenAI Realtime — server/openai-voice-relay.ts (Fly)
  → Fallback: Volcengine — server/voice-relay.ts (legacy, no coach)
```

**Session UI:** `src/components/session/voice-interface.tsx`  
**Session page:** `src/app/i/[slug]/session/page.tsx` passes `practiceMode` via `getPracticeMode(interview.data)`.

### Environment variables (see `.env.example`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_OPENAI_VOICE_RELAY_URL` | Fly / local OpenAI relay WebSocket URL |
| `NEXT_PUBLIC_VOICE_RELAY_URL` | Legacy Volcengine relay |
| `NEXT_PUBLIC_VOICE_RELAY_PRIMARY` | `voice` \| `openai` — routing order |
| `OPENAI_REALTIME_API_KEY` / `OPENAI_API_KEY` | Realtime auth |
| `OPENAI_REALTIME_MODEL` | e.g. `gpt-4o-realtime-preview` |
| `OPENAI_REALTIME_VOICE` | TTS voice id |
| `USE_AZURE_OPENAI_REALTIME` | Optional Azure Realtime path |
| `VOICE_MIN_COMMIT_WORDS`, `VOICE_MIN_COMMIT_CHARS` | Transcript commit thresholds |
| `VOICE_FRAGMENT_MERGE_MS` | Mock fragment merge (default 4000) |
| `VOICE_COACH_FRAGMENT_MERGE_MS` | Coach fragment merge (default 5000) |

**Local dev:** `npm run dev:openai-voice` (port 8082), `npm run dev:voice` (Volcengine, 8081).

### Major relay fixes (implemented)

| Fix | Where |
|-----|-------|
| OpenAI direct Realtime (optional Azure) | `server/openai-voice-relay.ts` |
| GA Realtime API (`input_text` / `output_text` for history replay) | `server/openai-voice-relay-helpers.ts` |
| Reconnect + conversation history replay | `openai-voice-relay.ts` |
| ASR fragment merging / transcript completeness | relay + `tests/merge-asr-text.test.ts` |
| Block `response.create` while user is speaking | relay |
| Mock auto turn-taking + answer completion timing | helpers + relay |
| Short voice nav commands ("move on", "next question") | `DEFAULT_STRICT_NAV_MAX_WORDS` in helpers |
| Coach manual flow events | `coach_answer_done`, `coach_retry_question` |

**Coach Mode requires OpenAI relay.** Set `NEXT_PUBLIC_VOICE_RELAY_PRIMARY=openai` in production if Volcengine failover would drop coach behavior.

### Audio storage

**Normal candidate practice does not store raw audio.** Delivery metrics are computed from transcript + timing (`src/lib/voice/delivery-analysis.ts`). Recruiter video flows may still use `audioRecordingUrl` / Supabase storage (`003_audio_recordings.sql`).

---

## Coach Mode

**Manual, button-driven.** Parker does not auto-advance after coaching.

### Behavior

1. Candidate answers one question at a time.
2. Candidate clicks **"I'm done answering"** → relay receives `coach_answer_done` → Parker gives coaching feedback (score, strength, gap, improvement, example phrases; STAR / product tips as appropriate).
3. Candidate chooses **Try again** (`coach_retry_question`) or **Next question** (button or short voice command).
4. Bottom **Next** control is hidden in coach mode (`voice-interface.tsx`).

### Key files

| File | Role |
|------|------|
| `src/lib/practice/coach-mode-prompt.ts` | Voice instructions, opening line, coaching format |
| `src/lib/practice/coach-mode-ui.ts` | UI labels, phases, system prompts for relay events |
| `src/components/session/coach-mode-controls.tsx` | Panel + phased buttons |
| `server/openai-voice-relay.ts` | `applyPracticeModeToVoicePrompt`, event handlers |
| `src/hooks/use-voice.ts` | Sends `coach_answer_done`, `coach_retry_question` |

### UI phases

`answering` → `coaching` (spinner) → `waiting_for_choice` (Try again / Next question).

Controls render when `shouldShowCoachControls(practiceMode, preview)`; buttons disabled until WebSocket connected.

### Relay vs UI

Voice coaching can work on Fly while UI strings are missing if **Vercel** bundle is stale — verify both deploys after coach changes.

---

## Mock Interview behavior

**Automatic turn-taking.** Parker follows up and advances when the candidate gives a substantive answer.

- `practiceMode: "mock"` in `customBranding` (default).
- Relay uses mock-specific timing (`MOCK_ANSWER_COMPLETION_MS`, answer completion reason in `openai-voice-relay-helpers.ts`).
- `signal_question_change` advances questions without manual buttons.
- Shorter fragment merge window than coach (`VOICE_FRAGMENT_MERGE_MS`).

Prompt shaping: `applyPracticeModeToVoicePrompt` in `openai-voice-relay.ts` (mock path in `coach-mode-prompt.ts` / shared practice mode helpers).

---

## Reports and scoring

### Generation

- **Shared generator:** `src/lib/ai/generate-session-summary.ts`
- **Prompt:** `src/lib/ai/prompts/summary.ts`
- **Triggers:**
  - Voice practice complete: `POST /api/voice/save` with `complete: true` → `src/app/api/voice/save/route.ts`
  - Recruiter sessions: `POST /api/ai/summarize`
- **Chat-only complete:** `trpc.session.complete` does **not** auto-generate summary — prefer voice for practice.

### Persisted on `sessions`

`summary`, `insights` (JSON: `questionEvaluations`, `criteriaEvaluations`, themes, key insights), `themes`, `sentiment`.

### Scoring UI

- `src/lib/session-score.ts` — overall score from `insights.questionEvaluations`
- Candidate report: `src/app/(dashboard)/my-sessions/[sessionId]/page.tsx`
- Formatting helpers: `src/lib/practice/format.ts`

### Delivery feedback (no raw audio)

`src/lib/voice/delivery-analysis.ts` — WPM, filler words, hedging, long pauses, answer length signals.

- Per-message `delivery` JSON via voice save (`src/app/api/voice/save/logic.ts`)
- Session rollup → included in summary prompt
- Coach relay can reference delivery signals when coaching

---

## Usage and pricing

### Implemented

| Piece | Location |
|-------|----------|
| `usage_events` table | `supabase/migrations/005_usage_events.sql` |
| `profiles.practicePlan` | `free` \| `starter` \| `pro` |
| Limits | `src/lib/practice/usage/constants.ts` |
| Countable session rules | `src/lib/practice/usage/is-countable.ts` |
| Enforcement on start | `practice.start` in `src/server/routers/practice.ts` |
| Recording on complete | `src/lib/practice/usage/record-usage.ts` |

| Plan | Monthly practice sessions |
|------|---------------------------|
| **free** | 3 |
| **starter** | 15 |
| **pro** | Unlimited (`null` limit) |

Countable session: `COMPLETED`, `isPractice`, and (≥1 user message **or** duration ≥ 120s), excluding empty sub-60s abandons.

### Discussed, not implemented

| Item | Notes |
|------|-------|
| **Stripe** | No payment integration in repo |
| **Sprint Pass** | One-time session bundle — product discussion only |
| **Public pricing page** | Not built |

---

## Database and migrations

Base schema: `supabase/migrations/001_initial_schema.sql` (Aural).

PrepWise / Parker era additions:

| Migration | Purpose |
|-----------|---------|
| `002_activity_segments.sql` | Session activity segments |
| `003_audio_recordings.sql` | `audioRecordingUrl` on sessions (video/recruiter) |
| `004_add_is_practice.sql` | `interviews.isPractice` |
| `005_usage_events.sql` | `usage_events`, `profiles.practicePlan` |
| `006_add_user_type.sql` | `profiles.user_type` candidate \| recruiter |

Key tables: `profiles`, `organizations`, `organization_members`, `projects`, `interviews`, `questions`, `sessions`, `messages`, `candidates`, `usage_events`, `api_keys`, `support_tickets`.

Regenerate types: `npm run db:types`.

---

## Deployment

| Surface | Host | Entry |
|---------|------|-------|
| Next.js app | **Vercel** | `next build` / production deploy |
| Voice relay | **Fly.io** app `parkerhero-voice` | `Dockerfile.voice` → `npx tsx server/openai-voice-relay.ts`, port 8080 |
| Database | **Supabase** | Hosted Postgres + Auth + Storage |

**Marketing:** `src/app/page.tsx` currently redirects to `/dashboard`. Assets: `public/images/marketing/parker-logo.png`.

---

## Known issues and testing focus

| Issue | Notes |
|-------|-------|
| **Vercel / Fly version skew** | Coach voice on Fly but UI missing if Vercel not redeployed |
| **Relay primary** | Volcengine fallback ignores `practiceMode` — force OpenAI primary for Coach |
| **Session completion race** | `session-completion-screen.tsx` — effect cleanup + `runStartedRef` can leave spinner stuck on `processing` |
| **Checklist skip not auth-gated** | Anyone with practice interview metadata skips checklist |
| **Transcript / turn-taking** | Keep testing mock auto-advance, coach manual flow, short nav phrases |
| **Chat practice summary** | No auto-summary on chat-only complete |
| **Report generation timeout** | Long sessions may hit feedback-pending fallback |

---

## Roadmap

### Near term

- [ ] Stripe + plan enforcement beyond `practicePlan` default
- [ ] Public landing page with product screenshots
- [ ] Pricing page (Free / Starter / Pro; Sprint Pass if productized)
- [ ] Marketing site copy (replace Aural docs in `src/content/docs/` where candidate-facing)
- [ ] Email notifications (session complete, weekly recap)
- [ ] Harden session completion screen (race fix)
- [ ] Optional: auth-gate practice checklist skip

### Later

- [ ] Avatar / video presence for Parker (optional)
- [ ] B2B bootcamps / universities (multi-tenant licensing)
- [ ] Referral program, public question bank
- [ ] Webhook dispatcher (table exists, no pipeline)
- [ ] Global search backend

### Done (reference)

- [x] Candidate / recruiter personas + route guards
- [x] Voice-first practice (Mock + Coach)
- [x] OpenAI Realtime relay + reconnect + transcript pipeline
- [x] Coach UI + manual answer flow
- [x] Practice checklist skip (default practice flags)
- [x] Delivery metrics in reports
- [x] JD URL + resume on practice setup
- [x] Usage limits (`usage_events`, `practicePlan`)
- [x] Candidate dashboard, My Sessions, Progress

---

## Guardrails for future coding

| Rule | Detail |
|------|--------|
| **Do not break recruiter flows** | Invites, public slug, preview, `/interviews/*`, anti-cheating, video, summarize API |
| **Candidate practice skips checklist** | Only when `shouldSkipCandidatePracticeOnboarding()` — practice + no preview + no anti-cheating + no video |
| **Coach Mode = manual** | Buttons + `coach_answer_done` / `coach_retry_question`; no auto-advance after coaching |
| **Mock Interview = automatic** | `signal_question_change` when answer is substantive; mock timing in relay helpers |
| **Practice does not store raw audio** | Delivery from transcript/timing; `videoEnabled: false` on practice create |
| **Fly deploy for relay changes** | `openai-voice-relay.ts`, `coach-mode-prompt.ts` (imported by relay), `openai-voice-relay-helpers.ts` |
| **Vercel deploy for UI** | `voice-interface.tsx`, `coach-mode-controls.tsx`, practice pages, completion screen |
| **Preserve `practiceMode` in voice init** | `use-voice.ts` `buildInitMessage` must spread `interviewContext` |
| **Coach requires OpenAI relay** | Do not rely on Volcengine path for coach features |

---

## Key file index

```
# Product / routing
src/app/layout.tsx                          # Parker metadata
src/app/page.tsx                            # Redirect → /dashboard
src/app/(dashboard)/onboarding/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/practice/page.tsx
src/app/(dashboard)/my-sessions/
src/app/(dashboard)/progress/page.tsx
src/app/i/[slug]/session/page.tsx
src/lib/auth/user-type-routes.ts

# Practice
src/server/routers/practice.ts
src/lib/practice/practice-mode.ts
src/lib/practice/job-description-context.ts
src/lib/practice/usage/constants.ts
src/lib/practice/usage/is-countable.ts
src/lib/session/skip-practice-onboarding.ts
src/lib/session/post-interview-redirect.ts
src/lib/session/session-has-feedback.ts
src/lib/session/session-completion-flow.ts

# Coach / Mock
src/lib/practice/coach-mode-prompt.ts
src/lib/practice/coach-mode-ui.ts
src/components/session/coach-mode-controls.tsx
src/components/session/voice-interface.tsx
src/hooks/use-voice.ts

# Voice relay
src/lib/voice/relay-routing.ts
server/openai-voice-relay.ts
server/openai-voice-relay-helpers.ts
server/voice-relay.ts                    # legacy Volcengine
Dockerfile.voice
fly.toml

# Reports / delivery
src/lib/ai/generate-session-summary.ts
src/lib/ai/prompts/summary.ts
src/lib/session-score.ts
src/lib/voice/delivery-analysis.ts
src/app/api/voice/save/route.ts
src/components/session/session-completion-screen.tsx

# Deploy / config
.env.example
supabase/migrations/004_add_is_practice.sql
supabase/migrations/005_usage_events.sql
supabase/migrations/006_add_user_type.sql
```

---

## Naming reference

| Aural / recruiter term | Parker / candidate term |
|------------------------|---------------------------|
| Interview (template) | Mock interview / practice session |
| Session | Practice run |
| Candidate (invite record) | You / practice history |
| Results | My Sessions report |
| Recruiter dashboard | Dashboard (recruiter variant unchanged) |
| Organization / Project | Hidden for candidates (auto-created) |

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| May 2026 | Fork Aural OSS (MIT) | Working voice + interview infra |
| May 2026 | B2C candidates as primary; keep B2B stack | Faster MVP; future bootcamp licensing |
| May 2026 | Brand: **Parker** | Customer-facing; repo stays PrepWise |
| May 2026 | OpenAI Realtime as primary voice | Quality; GA API support in relay |
| May 2026 | Mock vs Coach practice modes | Mock = realistic flow; Coach = deliberate feedback |
| May 2026 | Usage limits in DB before Stripe | `usage_events` + `practicePlan` |
| May 2026 | Delivery metrics without audio storage | Privacy + cost; transcript-based analysis |
| May 2026 | Fly for relay, Vercel for app | Separate deploy lifecycles |
| May 2026 | Plans: free 3 / starter 15 / pro unlimited | Codified in `constants.ts`; Stripe TBD |
| May 2026 | Sprint Pass discussed | One-time bundle — not implemented |
