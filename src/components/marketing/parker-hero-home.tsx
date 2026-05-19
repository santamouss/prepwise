import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  MARKETING_HIRING_REGISTER,
  MARKETING_LOGIN,
  MARKETING_PRACTICE_REGISTER,
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

function Logo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="pk-logo">
      <Image
        src="/images/marketing/parker-logo.png"
        alt=""
        width={120}
        height={28}
        className="h-[22px] w-auto"
        priority
      />
      {showWordmark ? <span className="sr-only">ParkerHero</span> : null}
    </span>
  );
}

export function ParkerHeroHome() {
  return (
    <div className="parker-marketing min-h-screen">
      <header className="pk-header">
        <div className="pk-container pk-header-inner">
          <Link href="/" className="pk-logo" aria-label="ParkerHero home">
            <Logo />
          </Link>
          <nav className="pk-nav" aria-label="Primary">
            <Link href="#how">How it works</Link>
            <Link href="#coach">Coach Mode</Link>
            <Link href="#pricing">Pricing</Link>
          </nav>
          <div className="pk-header-cta">
            <Link href={MARKETING_LOGIN} className="pk-sign-in">
              Sign in
            </Link>
            <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary pk-btn-sm">
              Start free practice
            </Link>
          </div>
        </div>
      </header>

      <section className="pk-hero">
        <div className="pk-container pk-hero-grid">
          <div className="pk-animate-in">
            <span className="pk-eyebrow">
              <span className="pk-eyebrow-dot" aria-hidden />
              Now with voice interviews
            </span>
            <h1>
              Practice interviews with <span className="pk-accent">Parker</span>, your AI
              interview coach.
            </h1>
            <p className="pk-hero-sub">
              Run realistic voice mock interviews, get instant feedback, and improve before the
              real thing.
            </p>
            <div className="pk-hero-cta">
              <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary">
                Start free practice
              </Link>
              <Link href={MARKETING_HIRING_REGISTER} className="pk-btn pk-btn-secondary">
                I&apos;m hiring candidates
              </Link>
            </div>
            <div className="pk-meta-row">
              <span>
                <CheckIcon />
                Free to start
              </span>
              <span>
                <CheckIcon />
                No credit card
              </span>
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
          <div className="pk-steps">
            <div className="pk-step">
              <div className="pk-step-num">01</div>
              <h3>Choose your role</h3>
              <p>Tell Parker what role, company, or job description you&apos;re preparing for.</p>
            </div>
            <div className="pk-step">
              <div className="pk-step-num">02</div>
              <h3>Practice with Parker</h3>
              <p>Answer realistic interview questions by voice, with natural follow-ups.</p>
            </div>
            <div className="pk-step">
              <div className="pk-step-num">03</div>
              <h3>Get feedback</h3>
              <p>Review your score, strengths, gaps, and delivery tips after each session.</p>
            </div>
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
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M10 13a3 3 0 003-3V5a3 3 0 10-6 0v5a3 3 0 003 3z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M5 10a5 5 0 0010 0M10 15v3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Mock Interviews"
              description="Simulate a real interview with natural follow-ups across behavioral, technical, and case formats."
            />
            <FeatureCard
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M3 5h14M3 10h14M3 15h9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Coach Mode"
              description="Practice one question at a time. Retry your answer, refine your story, and build confidence."
            />
            <FeatureCard
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M3 16l4-4 3 3 7-7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 8h3v3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="Delivery Feedback"
              description="See pacing, filler words, hedging, and clarity suggestions — not just what you said, but how."
            />
            <FeatureCard
              icon={
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <rect
                    x="3"
                    y="3"
                    width="14"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M7 13V9M10 13V7M13 13v-2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              }
              title="Progress Tracking"
              description="Track sessions, scores, and improvement areas over time — so you can see what's working."
            />
          </div>
        </div>
      </section>

      <section className="pk-section pk-feedback-section">
        <div className="pk-container">
          <div className="pk-section-head">
            <div className="pk-section-tag">Feedback that&apos;s actually useful</div>
            <h2>Specific notes, not generic praise.</h2>
            <p>Parker tells you exactly what to change, and why it matters.</p>
          </div>
          <div className="pk-feedback-card">
            <div className="pk-feedback-head">
              <div className="pk-feedback-avatar">P</div>
              <div>
                <div className="pk-feedback-name">Parker</div>
                <div className="pk-feedback-role">
                  Reviewing: &quot;Tell me about a product launch…&quot;
                </div>
              </div>
              <div className="pk-feedback-badge">Behavioral · Q3</div>
            </div>
            <div className="pk-feedback-body">
              <p className="pk-quote">
                <span className="pk-quote-mark">&ldquo;</span>
                Good structure. One thing missing is the outcome. Try adding a measurable result,
                like adoption, revenue impact, time saved, or customer feedback.
                <span className="pk-quote-mark">&rdquo;</span>
              </p>
              <div className="pk-feedback-stats">
                <div className="pk-stat pk-stat-score">
                  <div className="pk-stat-label">Score</div>
                  <div className="pk-stat-value">
                    7<span className="pk-stat-denom">/10</span>
                  </div>
                </div>
                <div className="pk-stat">
                  <div className="pk-stat-label">Strength</div>
                  <div className="pk-stat-value">Clear context</div>
                </div>
                <div className="pk-stat">
                  <div className="pk-stat-label">Improve</div>
                  <div className="pk-stat-value">Add measurable impact</div>
                </div>
                <div className="pk-stat">
                  <div className="pk-stat-label">Try again with</div>
                  <div className="pk-stat-value">Situation → Action → Result</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="pk-recruiter" id="recruiter">
        <div className="pk-container">
          <div className="pk-recruiter-inner">
            <div>
              <h3>Hiring candidates?</h3>
              <p>
                Create structured AI interviews, share interview links, and review candidate
                reports — all in one place.
              </p>
            </div>
            <Link href={MARKETING_HIRING_REGISTER} className="pk-btn pk-btn-secondary">
              Explore hiring tools →
            </Link>
          </div>
        </div>
      </section>

      <section className="pk-final">
        <div className="pk-container">
          <h2>Ready for your next interview?</h2>
          <p>Start with a free practice session and get feedback from Parker in minutes.</p>
          <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary">
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
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Contact</Link>
          </nav>
          <div>© {new Date().getFullYear()} ParkerHero, Inc.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="pk-feature">
      <div className="pk-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
