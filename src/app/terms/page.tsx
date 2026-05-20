import { LegalDocumentBody } from "@/components/marketing/legal-document-body";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/constants";
import { TERMS_SECTIONS } from "@/lib/legal/terms-content";
import type { Metadata } from "next";

const toc = TERMS_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
}));

export const metadata: Metadata = {
  title: {
    absolute: "Terms of Service | ParkerHero",
  },
  description:
    "Terms governing your use of ParkerHero, including AI coaching disclaimers, account responsibilities, and service limitations.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      intro="Please read these Terms carefully before using ParkerHero. They form a binding agreement between you and NeuroWave Labs LLC."
      toc={toc}
      current="terms"
    >
      <LegalDocumentBody sections={TERMS_SECTIONS} />
    </LegalPageLayout>
  );
}
