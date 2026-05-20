import { LegalDocumentBody } from "@/components/marketing/legal-document-body";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/constants";
import { PRIVACY_SECTIONS } from "@/lib/legal/privacy-content";
import type { Metadata } from "next";

const toc = PRIVACY_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
}));

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy | ParkerHero",
  },
  description:
    "How ParkerHero collects, uses, and protects your information when you practice interviews with AI voice coaching.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro="This policy describes how NeuroWave Labs LLC (“ParkerHero,” “we,” “us,” or “our”) handles personal information when you use our interview practice and coaching services."
      toc={toc}
      current="privacy"
    >
      <LegalDocumentBody sections={PRIVACY_SECTIONS} />
    </LegalPageLayout>
  );
}
