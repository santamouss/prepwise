import { ParkerHeroHome } from "@/components/marketing/parker-hero-home";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ParkerHero — Practice interviews with Parker, your AI interview coach",
  description:
    "Run realistic voice mock interviews, get instant feedback, and improve before the real thing.",
};

export default function HomePage() {
  return <ParkerHeroHome />;
}
