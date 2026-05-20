import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_ENTITY } from "@/lib/legal/constants";
import {
  MARKETING_BLOG,
  MARKETING_HOME,
  MARKETING_LOGIN,
  MARKETING_PRACTICE_REGISTER,
  MARKETING_PRIVACY,
  MARKETING_TERMS,
} from "./marketing-links";
import "./marketing-home.css";
import "./blog-home.css";

type BlogMarketingShellProps = {
  children: ReactNode;
  activeNav?: "blog";
};

export function BlogMarketingShell({ children, activeNav }: BlogMarketingShellProps) {
  return (
    <div className="parker-marketing parker-blog min-h-screen bg-[var(--pk-bg-soft)]">
      <header className="pk-header pk-blog-header">
        <div className="pk-container pk-header-inner pk-blog-header-inner">
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
          <nav className="pk-nav pk-blog-nav" aria-label="Primary">
            <Link href={`${MARKETING_HOME}#how`}>How it works</Link>
            <Link href={`${MARKETING_HOME}#coach`}>Coach Mode</Link>
            <Link href={`${MARKETING_HOME}#pricing`}>Pricing</Link>
            <Link
              href={MARKETING_BLOG}
              aria-current={activeNav === "blog" ? "page" : undefined}
              className={activeNav === "blog" ? "pk-nav-active" : undefined}
            >
              Blog
            </Link>
          </nav>
          <div className="pk-blog-header-actions">
            <Link href={MARKETING_LOGIN} className="pk-sign-in">
              Sign in
            </Link>
            <Link href={MARKETING_PRACTICE_REGISTER} className="pk-btn pk-btn-primary pk-btn-sm">
              Start free practice
            </Link>
          </div>
        </div>
      </header>

      <main className="pk-blog-main">{children}</main>

      <footer className="pk-footer">
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
            <Link href={MARKETING_BLOG}>Blog</Link>
            <Link href={MARKETING_PRIVACY}>Privacy</Link>
            <Link href={MARKETING_TERMS}>Terms</Link>
            <a href={`mailto:${LEGAL_ENTITY.email}`}>Contact</a>
          </nav>
          <div>© {new Date().getFullYear()} {LEGAL_ENTITY.name}</div>
        </div>
      </footer>
    </div>
  );
}
