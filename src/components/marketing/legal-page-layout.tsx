import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_ENTITY } from "@/lib/legal/constants";
import {
  MARKETING_HOME,
  MARKETING_LOGIN,
  MARKETING_PRACTICE_REGISTER,
  MARKETING_PRIVACY,
  MARKETING_TERMS,
} from "./marketing-links";
import "./marketing-home.css";
import "./legal-home.css";

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  intro?: string;
  toc: { id: string; title: string }[];
  children: ReactNode;
  current: "privacy" | "terms";
};

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  toc,
  children,
  current,
}: LegalPageLayoutProps) {
  return (
    <div className="parker-marketing parker-legal min-h-screen">
      <header className="pk-header pk-legal-header">
        <div className="pk-container pk-header-inner pk-legal-header-inner">
          <Link href={MARKETING_HOME} className="pk-logo pk-header-logo" aria-label="ParkerHero home">
            <Image
              src="/images/marketing/parker-logo.png"
              alt=""
              width={240}
              height={56}
              className="pk-logo-img-lg w-auto"
              priority
            />
            <span className="sr-only">ParkerHero</span>
          </Link>
          <div className="pk-legal-header-actions">
            <Link href={MARKETING_LOGIN} className="pk-sign-in">
              Sign in
            </Link>
            <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary pk-btn-sm">
              Start free practice
            </Link>
          </div>
        </div>
      </header>

      <main className="pk-legal-main">
        <div className="pk-legal-layout pk-container">
          <aside className="pk-legal-toc" aria-label="On this page">
            <p className="pk-legal-toc-label">On this page</p>
            <nav>
              <ol>
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="pk-legal-article">
            <header className="pk-legal-article-head">
              <h1>{title}</h1>
              <p className="pk-legal-updated">Last updated: {lastUpdated}</p>
              {intro ? <p className="pk-legal-intro">{intro}</p> : null}
            </header>
            <div className="pk-legal-body">{children}</div>
          </article>
        </div>
      </main>

      <footer className="pk-footer pk-legal-footer">
        <div className="pk-container pk-footer-inner">
          <Link href={MARKETING_HOME} className="pk-logo" aria-label="ParkerHero home">
            <Image
              src="/images/marketing/parker-logo.png"
              alt=""
              width={120}
              height={28}
              className="pk-logo-img w-auto"
            />
          </Link>
          <nav className="pk-footer-nav" aria-label="Footer">
            <Link href={MARKETING_PRIVACY} aria-current={current === "privacy" ? "page" : undefined}>
              Privacy
            </Link>
            <Link href={MARKETING_TERMS} aria-current={current === "terms" ? "page" : undefined}>
              Terms
            </Link>
            <a href={`mailto:${LEGAL_ENTITY.email}`}>Contact</a>
          </nav>
          <div>© {new Date().getFullYear()} {LEGAL_ENTITY.name}</div>
        </div>
      </footer>
    </div>
  );
}
