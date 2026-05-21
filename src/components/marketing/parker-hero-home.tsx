"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  MARKETING_BLOG,
  MARKETING_LOGIN,
  MARKETING_PRIVACY,
  MARKETING_TERMS,
} from "./marketing-links";
import { PricingSection } from "./pricing-section";
import "./marketing-home.css";

function CheckIcon() {
  return (
    <svg
      className="pk-check"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="#3B6FF0"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Logo({
  showWordmark = true,
  large = false,
}: {
  showWordmark?: boolean;
  large?: boolean;
}) {
  return (
    <span className="pk-logo">
      <Image
        src="/images/marketing/parker-logo.png"
        alt=""
        width={large ? 240 : 120}
        height={large ? 56 : 28}
        className={large ? "pk-logo-img-lg w-auto" : "pk-logo-img w-auto"}
        priority
      />
      {showWordmark ? <span className="sr-only">ParkerHero</span> : null}
    </span>
  );
}

export function ParkerHeroHome() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="parker-marketing min-h-screen">
      <header className="pk-header">
        <div className="pk-container pk-header-inner">
          <Link href="/" className="pk-logo pk-header-logo" aria-label="ParkerHero home">
            <Logo large />
          </Link>
          <nav className="pk-nav" aria-label="Primary">
            <Link href="#how">How it works</Link>
            <Link href="#coach">Coach Mode</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href={MARKETING_BLOG}>Blog</Link>
          </nav>
          <div className="pk-header-cta">
            <Link href={MARKETING_LOGIN} className="pk-sign-in">
              Sign in
            </Link>
            <Link href="/practice" className="pk-btn pk-btn-primary pk-btn-sm">
              Start free practice
            </Link>
          </div>
          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="pk-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="pk-mobile-menu">
            <nav className="pk-mobile-nav">
              <Link href="#how" onClick={() => setMenuOpen(false)}>
                How it works
              </Link>
              <Link href="#coach" onClick={() => setMenuOpen(false)}>
                Coach Mode
              </Link>
              <Link href="#pricing" onClick={() => setMenuOpen(false)}>
                Pricing
              </Link>
              <Link href={MARKETING_LOGIN} onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
            </nav>
            <Link
              href="/practice"
              className="pk-btn pk-btn-primary pk-mobile-cta"
              onClick={() => setMenuOpen(false)}
            >
              Start free practice
            </Link>
          </div>
        )}
      </header>

      <section className="pk-hero">
        {/* Warm gradient background */}
        <div className="pk-hero-bg-blend"></div>

        <div className="pk-container pk-hero-grid">
          <div className="pk-hero-content pk-animate-in">
            <span className="pk-eyebrow">
              <span className="pk-eyebrow-dot" aria-hidden />
              AI interview coaching
            </span>

            <h1 className="pk-hero-title">
              Interview confidence
              <br />
              <span className="pk-highlight">starts with practice</span>
            </h1>

            <p className="pk-hero-sub">
              Voice-first mock interviews with Parker. Get instant, honest feedback on your answers, delivery, and impact. Practice until you're ready.
            </p>

            <div className="pk-hero-benefits">
              <div className="pk-benefit-item">
                <CheckIcon />
                <span>Realistic voice interviews</span>
              </div>
              <div className="pk-benefit-item">
                <CheckIcon />
                <span>Honest, actionable feedback</span>
              </div>
              <div className="pk-benefit-item">
                <CheckIcon />
                <span>Coach Mode for deliberate practice</span>
              </div>
            </div>

            <div className="pk-hero-cta">
              <Link href="/practice" className="pk-btn pk-btn-primary pk-btn-lg">
                Start free practice
              </Link>
              <Link href="/practice" className="pk-btn pk-btn-secondary pk-btn-lg">
                I&apos;m hiring candidates
              </Link>
            </div>

            <div className="pk-meta-row">
              <span className="pk-meta-badge">Free to start</span>
              <span className="pk-meta-badge">No credit card</span>
            </div>
          </div>

          <div className="pk-mock-wrap pk-animate-in pk-animate-delay-1">
            <div className="pk-mock">
              <div className="pk-mock-bar">
                <div className="pk-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="pk-session">
                  <span className="pk-session-pill" aria-hidden />
                  Live session
                </div>
              </div>
              <div className="pk-mock-body">
                <div className="pk-mock-head">
                  <div>
                    <div className="pk-mock-title">Product Manager Interview</div>
                    <div className="pk-mock-sub">Round 2 · Behavioral</div>
                  </div>
                  <div className="pk-mock-timer">12:04</div>
                </div>

                <div className="pk-listening">
                  <div className="pk-wave" aria-hidden>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                  <div className="pk-listening-text">
                    Parker is listening…
                    <small>Take your time. Speak naturally.</small>
                  </div>
                </div>

                <div className="pk-transcript">
                  <div className="pk-bubble pk-bubble-parker">
                    <div className="pk-who">P</div>
                    <div className="pk-bubble-body">
                      <span className="pk-bubble-label">Parker</span>
                      Tell me about a time you led a product launch that didn&apos;t go as
                      planned.
                    </div>
                  </div>
                  <div className="pk-bubble pk-bubble-you">
                    <div className="pk-who">You</div>
                    <div className="pk-bubble-body">
                      <span className="pk-bubble-label">You</span>
                      At my last role, we launched a new onboarding flow. We ran A/B tests for two
                      weeks, but activation actually dropped 8%. So we paused the rollout, dug into
                      session recordings, and found a gap in the empty state…
                    </div>
                  </div>
                </div>

                <div className="pk-feedback-inline">
                  <div className="pk-feedback-inline-icon" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 1.5l1.8 4 4.4.6-3.2 3 .8 4.4L8 11.4 4.2 13.5 5 9.1 1.8 6.1l4.4-.6L8 1.5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="pk-feedback-inline-text">
                    <strong>Add a measurable result</strong> to make this answer stronger.
                    <small>Try ending with the metric you moved or what you learned.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pk-section pk-how" id="how">
        <div className="pk-container">
          <div className="pk-section-head">
            <div className="pk-section-tag">How it works</div>
            <h2>Three steps to a better interview.</h2>
            <p>From job description to feedback in under five minutes.</p>
          </div>
          <div className="pk-steps-grid">
            <div className="pk-step-card">
              <div className="pk-step-image">
                <Image
                  src="/images/marketing/create_your_role.png"
                  alt="Choose your role"
                  width={600}
                  height={400}
                />
              </div>
              <div className="pk-step-text">
                <span className="pk-step-badge">01</span>
                <h3>Choose your role</h3>
                <p>Tell Parker what role, company, or job description you&apos;re preparing for.</p>
              </div>
            </div>

            <div className="pk-step-card">
              <div className="pk-step-image">
                <Image
                  src="/images/marketing/practice_with_parker.png"
                  alt="Practice with Parker"
                  width={600}
                  height={400}
                />
              </div>
              <div className="pk-step-text">
                <span className="pk-step-badge">02</span>
                <h3>Practice with Parker</h3>
                <p>Answer realistic interview questions by voice, with natural follow-ups.</p>
              </div>
            </div>

            <div className="pk-step-card">
              <div className="pk-step-image">
                <Image
                  src="/images/marketing/get_feedback.png"
                  alt="Get feedback"
                  width={600}
                  height={400}
                />
              </div>
              <div className="pk-step-text">
                <span className="pk-step-badge">03</span>
                <h3>Get feedback</h3>
                <p>Review your score, strengths, gaps, and delivery tips after each session.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pk-section pk-compare" id="compare">
        <div className="pk-container">
          <div className="pk-section-head pk-compare-head">
            <div className="pk-section-tag pk-compare-tag">Parker vs Generic AI</div>
            <h2 className="pk-compare-title">Why not just use ChatGPT?</h2>
            <p className="pk-compare-sub">
              Generic AI gives you encouragement. Parker gives you the truth.
            </p>
          </div>

          <div className="pk-compare-grid">
            <article className="pk-compare-card pk-compare-card--generic">
              <header className="pk-compare-card-head">
                <span className="pk-compare-icon pk-compare-icon--x" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M9 9l6 6M15 9l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div className="pk-compare-card-titles">
                  <h3 className="pk-compare-card-title">ChatGPT &amp; Generic AI</h3>
                  <p className="pk-compare-card-sub">
                    Great for many things. Not built for this.
                  </p>
                </div>
              </header>
              <ul className="pk-compare-list">
                {[
                  "No honest scoring — praises weak answers",
                  "No structured interview flow or question management",
                  "Questions not tailored to your specific role or JD",
                  "No delivery feedback (filler words, pacing, hedging)",
                  "No memory — no progress tracking across sessions",
                  "General purpose, not built for interview practice",
                  "No Coach Mode — can't retry and refine answers",
                ].map((item) => (
                  <li key={item} className="pk-compare-li pk-compare-li--neg">
                    <span className="pk-compare-mark pk-compare-mark--neg" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="pk-compare-card pk-compare-card--parker">
              <span className="pk-compare-card-badge">Built for interviews</span>
              <header className="pk-compare-card-head">
                <span className="pk-compare-icon pk-compare-icon--parker" aria-hidden>
                  P
                </span>
                <div className="pk-compare-card-titles">
                  <h3 className="pk-compare-card-title">Parker</h3>
                  <p className="pk-compare-card-sub">
                    Voice-first. Honest. Built for interviews.
                  </p>
                </div>
              </header>
              <ul className="pk-compare-list">
                {[
                  "Voice-first — practice speaking out loud",
                  "Honest 1–10 scoring with specific gaps",
                  "Questions from your actual job description",
                  "STAR method coaching after every answer",
                  "Progress tracking across sessions",
                  "Coach Mode — retry until you nail it",
                ].map((item) => (
                  <li key={item} className="pk-compare-li pk-compare-li--pos">
                    <span className="pk-compare-mark pk-compare-mark--pos" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8.5L6.5 12L13 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="pk-compare-cta">
            <p className="pk-compare-cta-text">Ready to try the honest way?</p>
            <Link href="/practice" className="pk-compare-cta-btn">
              Start free practice
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 8h8m0 0L8 4m4 4l-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="pk-section" id="coach">
        <div className="pk-container">
          <div className="pk-section-head">
            <div className="pk-section-tag">What you get</div>
            <h2>Built for the way real interviews go.</h2>
            <p>Tools that meet you where you are — from your first practice to your final round.</p>
          </div>
          <div className="pk-features-grid">
            <FeatureCard
              visual={<MockVisual />}
              icon={<MicIcon />}
              title="Mock Interviews"
              description="Simulate a real interview with natural follow-ups across behavioral, technical, and case formats."
            />
            <FeatureCard
              visual={<CoachVisual />}
              icon={<CoachIcon />}
              title="Coach Mode"
              description="Practice one question at a time. Retry your answer, refine your story, and build confidence."
            />
            <FeatureCard
              visual={<DeliveryVisual />}
              icon={<DeliveryIcon />}
              title="Delivery Feedback"
              description="See pacing, filler words, hedging, and clarity suggestions — not just what you said, but how."
            />
            <FeatureCard
              visual={<ProgressVisual />}
              icon={<ProgressIcon />}
              title="Progress Tracking"
              description="Track sessions, scores, and improvement areas over time — so you can see what's working."
            />
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="pk-final">
        <div className="pk-container">
          <h2>Ready for your next interview?</h2>
          <p>Start with a free practice session and get feedback from Parker in minutes.</p>
          <Link href="/practice" className="pk-btn pk-btn-primary">
            Start free practice
          </Link>
        </div>
      </section>

      <footer className="pk-footer">
        <div className="pk-container pk-footer-inner">
          <Link href="/" className="pk-logo" aria-label="ParkerHero home">
            <Logo />
          </Link>
          <nav className="pk-footer-nav" aria-label="Footer">
            <Link href={MARKETING_BLOG}>Blog</Link>
            <Link href={MARKETING_PRIVACY}>Privacy</Link>
            <Link href={MARKETING_TERMS}>Terms</Link>
            <a href="mailto:info@parkerhero.com">Contact</a>
          </nav>
          <div>© {new Date().getFullYear()} ParkerHero</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  visual,
  icon,
  title,
  description,
}: {
  visual: ReactNode;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="pk-feature">
      <div className="pk-feature-visual">{visual}</div>
      <h3 className="pk-feature-title">
        <span className="pk-feature-badge">{icon}</span>
        {title}
      </h3>
      <p className="pk-feature-desc">{description}</p>
    </article>
  );
}

/* -------- Feature card icons (used inside the title badge) -------- */
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
function CoachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
function DeliveryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h12" />
      <path d="M4 12h16" />
      <path d="M4 18h8" />
    </svg>
  );
}
function ProgressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="13" width="4" height="7" rx="1" />
      <rect x="10" y="9" width="4" height="11" rx="1" />
      <rect x="16" y="5" width="4" height="15" rx="1" />
    </svg>
  );
}

/* -------- Feature card visuals -------- */

// Deterministic waveform bars so SSR and CSR match
const WAVE_BARS = Array.from({ length: 28 }, (_, i) => {
  const base = 22 + Math.round(Math.sin(i * 0.5) * 16) + ((i * 37) % 30);
  return {
    height: Math.min(100, Math.max(12, base)),
    delay: i * 55,
    duration: 900 + ((i * 113) % 700),
  };
});

function MockVisual() {
  return (
    <div className="pk-fv-mock">
      <div className="pk-fv-mock-topline">
        <span className="pk-fv-who">
          <span className="pk-fv-ava">I</span>
          Interviewer · Senior PM
        </span>
        <span className="pk-fv-live">
          <span className="pk-fv-live-dot" aria-hidden />
          Live
        </span>
      </div>
      <div className="pk-fv-quote">
        &ldquo;Walk me through how you&apos;d evaluate launching{" "}
        <em>Stories</em> inside a B2B notes app.&rdquo;
      </div>
      <div className="pk-fv-wave-row">
        <div className="pk-fv-mic" aria-hidden>
          <MicIcon />
        </div>
        <div className="pk-fv-wave" aria-hidden>
          {WAVE_BARS.map((bar, i) => (
            <span
              key={i}
              style={{
                height: `${bar.height}%`,
                animationDelay: `${bar.delay}ms`,
                animationDuration: `${bar.duration}ms`,
              }}
            />
          ))}
        </div>
        <div className="pk-fv-timestamp">00:42</div>
      </div>
    </div>
  );
}

function CoachVisual() {
  const attempts = [
    { n: "04", score: 88, width: 88, delay: 0, best: true },
    { n: "03", score: 74, width: 74, delay: 120 },
    { n: "02", score: 61, width: 61, delay: 240 },
  ];
  return (
    <div className="pk-fv-coach">
      <div className="pk-fv-qcard">
        <div className="pk-fv-qhead">
          <span>Behavioral · Question 3</span>
          <span className="pk-fv-pip" aria-hidden>
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="pk-fv-qtext">
          &ldquo;Tell me about a time you disagreed with a senior leader.&rdquo;
        </div>
      </div>
      <div className="pk-fv-attempts">
        {attempts.map((a) => (
          <div key={a.n} className={a.best ? "pk-fv-att pk-fv-att--best" : "pk-fv-att"}>
            <span className="pk-fv-att-n">{a.n}</span>
            <div className="pk-fv-att-bar">
              <i
                style={{
                  width: `${a.width}%`,
                  animationDelay: `${a.delay}ms`,
                }}
              />
            </div>
            <span className="pk-fv-att-score">{a.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryVisual() {
  return (
    <div className="pk-fv-deliv">
      <div className="pk-fv-trans">
        <span className="pk-fv-tag pk-fv-tag--strong">
          When our director pushed to ship,
        </span>{" "}
        I, <span className="pk-fv-tag pk-fv-tag--fill">um</span>, knew the data
        wasn&apos;t there.{" "}
        <span className="pk-fv-tag pk-fv-tag--hedge">I kind of</span> felt
        we&apos;d tank activation, so I ran a quick test —{" "}
        <span className="pk-fv-tag pk-fv-tag--fill">like</span>, real calls.{" "}
        <span className="pk-fv-tag pk-fv-tag--strong">
          I brought back a one-pager and a two-week delay.
        </span>
      </div>
      <div className="pk-fv-gauges">
        <div className="pk-fv-g">
          <div className="pk-fv-g-lbl">Pace</div>
          <div className="pk-fv-g-val">
            142<small>wpm</small>
          </div>
          <div className="pk-fv-g-meter">
            <i style={{ width: "68%" }} />
          </div>
        </div>
        <div className="pk-fv-g">
          <div className="pk-fv-g-lbl">Filler</div>
          <div className="pk-fv-g-val">7</div>
          <div className="pk-fv-g-meter pk-fv-g-meter--warn">
            <i style={{ width: "45%" }} />
          </div>
        </div>
        <div className="pk-fv-g">
          <div className="pk-fv-g-lbl">Clarity</div>
          <div className="pk-fv-g-val">82</div>
          <div className="pk-fv-g-meter pk-fv-g-meter--good">
            <i style={{ width: "82%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressVisual() {
  const streak = ["l1", "l2", "l1", "l2", "", "l1", "l2", "l3", "l2", "l3", "l3", "l2", "l3", "l3"];
  return (
    <div className="pk-fv-prog">
      <div className="pk-fv-prog-head">
        <span className="pk-fv-prog-lbl">Score · last 14 days</span>
        <span className="pk-fv-prog-delta">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 15l6-6 6 6" />
          </svg>
          +18%
        </span>
      </div>
      <div className="pk-fv-prog-chart">
        <svg viewBox="0 0 280 90" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="pk-fv-ga" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b6ff0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b6ff0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="#eef1f7" strokeWidth="1">
            <line x1="0" y1="22" x2="280" y2="22" />
            <line x1="0" y1="50" x2="280" y2="50" />
            <line x1="0" y1="78" x2="280" y2="78" />
          </g>
          <path
            d="M0,72 L20,68 L40,70 L60,60 L80,55 L100,58 L120,48 L140,42 L160,38 L180,40 L200,28 L220,22 L240,16 L260,10 L280,8 L280,90 L0,90 Z"
            fill="url(#pk-fv-ga)"
          />
          <path
            className="pk-fv-prog-line"
            d="M0,72 L20,68 L40,70 L60,60 L80,55 L100,58 L120,48 L140,42 L160,38 L180,40 L200,28 L220,22 L240,16 L260,10 L280,8"
            fill="none"
            stroke="#3b6ff0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
          <circle cx="280" cy="8" r="4" fill="#3b6ff0" />
          <circle cx="280" cy="8" r="8" fill="#3b6ff0" opacity="0.18" />
        </svg>
      </div>
      <div className="pk-fv-streak" aria-hidden>
        {streak.map((cls, i) => (
          <i key={i} className={cls ? `pk-fv-streak-${cls}` : ""} />
        ))}
      </div>
    </div>
  );
}
