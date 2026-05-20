"use client";

import { useAuth } from "@/components/auth-provider";
import {
  MARKETING_PRACTICE,
  MARKETING_PRACTICE_REGISTER,
} from "@/components/marketing/marketing-links";
import Link from "next/link";
import type { ComponentProps } from "react";

type PracticeCtaLinkProps = Omit<ComponentProps<typeof Link>, "href">;

/** Logged-in → /practice; logged-out → register with practice return params */
export function PracticeCtaLink({ children, ...props }: PracticeCtaLinkProps) {
  const { user, loading } = useAuth();
  const href = !loading && user ? MARKETING_PRACTICE : MARKETING_PRACTICE_REGISTER;

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
