import type { LegalSection } from "@/components/marketing/legal-types";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    blocks: [
      {
        type: "p",
        text: "These Terms of Service (“Terms”) govern your access to and use of ParkerHero, including our website, applications, and related services (collectively, the “Service”), operated by NeuroWave Labs LLC (“we,” “us,” or “our”).",
      },
      {
        type: "p",
        text: "By creating an account, starting a practice session, or otherwise using the Service, you agree to these Terms. If you do not agree, do not use the Service.",
      },
    ],
  },
  {
    id: "use-of-service",
    title: "Use of the Service",
    blocks: [
      {
        type: "p",
        text: "ParkerHero provides AI-powered interview practice, coaching, feedback, and related tools for job candidates. Certain features may also support recruiter or organizational workflows where enabled.",
      },
      {
        type: "p",
        text: "You are responsible for how you use the Service in connection with real interviews, applications, and employment decisions. ParkerHero is a practice and coaching product, not an employer, recruiter, or hiring platform.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    blocks: [
      {
        type: "p",
        text: "You must provide accurate account information and keep your credentials secure. You are responsible for activity under your account. Notify us promptly if you suspect unauthorized access.",
      },
      {
        type: "p",
        text: "We may refuse registration, suspend access, or terminate accounts that violate these Terms or pose risk to the Service or other users.",
      },
    ],
  },
  {
    id: "ai-disclaimer",
    title: "AI-Generated Feedback Disclaimer",
    blocks: [
      {
        type: "p",
        text: "Parker and related AI features produce automated coaching, scores, summaries, and suggestions based on available inputs. This output is informational and educational only.",
      },
      {
        type: "ul",
        items: [
          "AI feedback may be incomplete, biased, or incorrect.",
          "It does not guarantee interview performance, job offers, or hiring outcomes.",
          "You remain solely responsible for your interview preparation, responses, and career decisions.",
        ],
      },
      {
        type: "p",
        text: "Do not rely on the Service as a substitute for professional career, legal, or employment advice.",
      },
    ],
  },
  {
    id: "user-conduct",
    title: "User Conduct",
    blocks: [
      {
        type: "p",
        text: "You agree not to misuse the Service. Prohibited conduct includes, without limitation:",
      },
      {
        type: "ul",
        items: [
          "Violating applicable laws or third-party rights.",
          "Attempting to gain unauthorized access to systems, accounts, or data.",
          "Reverse engineering, scraping, or interfering with the Service except as permitted by law.",
          "Uploading malware, spam, or unlawful content.",
          "Using the Service to harass, impersonate, or deceive others.",
          "Misusing interview, invite, proctoring, or recruiter tooling to circumvent fair hiring processes or academic integrity rules.",
          "Reselling or sublicensing the Service without our written permission.",
        ],
      },
    ],
  },
  {
    id: "uploaded-content",
    title: "Uploaded Content",
    blocks: [
      {
        type: "p",
        text: "You retain ownership of content you upload or submit, including résumés, job descriptions, and session responses. You represent that you have the rights necessary to provide such content.",
      },
      {
        type: "p",
        text: "You grant us a limited, non-exclusive license to host, process, reproduce, and display your content solely to operate, improve, and provide the Service, including AI processing described in our Privacy Policy.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    blocks: [
      {
        type: "p",
        text: "The Service, including software, branding, design, and documentation (excluding your content), is owned by us or our licensors and protected by intellectual property laws. These Terms do not grant you any right to use our trademarks except as needed to use the Service in accordance with these Terms.",
      },
    ],
  },
  {
    id: "subscription-billing",
    title: "Subscriptions & Billing",
    blocks: [
      {
        type: "p",
        text: "Some features may be offered under free or paid plans with usage limits. When you purchase a paid plan, you agree to the pricing and billing terms presented at checkout.",
      },
      {
        type: "p",
        text: "Fees are generally non-refundable except where required by law or expressly stated otherwise. We may change plan features or pricing with reasonable notice where required. Continued use after a change may constitute acceptance.",
      },
      {
        type: "p",
        text: "If you subscribe through a third-party payment processor, their terms may also apply to payment handling.",
      },
    ],
  },
  {
    id: "service-availability",
    title: "Service Availability",
    blocks: [
      {
        type: "p",
        text: "We strive to keep ParkerHero available and reliable, but the Service is provided on an “as is” and “as available” basis. We may modify, suspend, or discontinue features with or without notice.",
      },
      {
        type: "p",
        text: "Maintenance, third-party outages, or factors outside our reasonable control may affect voice sessions, AI responses, or report generation.",
      },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    blocks: [
      {
        type: "p",
        text: "To the fullest extent permitted by law, we and our affiliates, officers, employees, and suppliers will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising from your use of the Service.",
      },
      {
        type: "p",
        text: "Our total liability for claims arising out of or relating to these Terms or the Service will not exceed the greater of (a) amounts you paid us for the Service in the twelve months before the claim or (b) one hundred U.S. dollars (USD $100).",
      },
      {
        type: "p",
        text: "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum extent permitted by law.",
      },
    ],
  },
  {
    id: "termination",
    title: "Termination",
    blocks: [
      {
        type: "p",
        text: "You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms, if required by law, or to protect the Service or other users.",
      },
      {
        type: "p",
        text: "Sections that by their nature should survive termination (including intellectual property, disclaimers, limitations of liability, and governing law) will survive.",
      },
    ],
  },
  {
    id: "changes-to-terms",
    title: "Changes to Terms",
    blocks: [
      {
        type: "p",
        text: "We may update these Terms from time to time. The revised Terms will be posted on this page with an updated “Last updated” date. Your continued use after changes become effective constitutes acceptance of the revised Terms.",
      },
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    blocks: [
      {
        type: "p",
        text: "These Terms are governed by the laws of the State of Wyoming, United States, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your jurisdiction provide otherwise.",
      },
      {
        type: "p",
        text: "Disputes will be resolved in the state or federal courts located in Wyoming, unless applicable law requires a different venue.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    blocks: [
      {
        type: "p",
        text: "For questions about these Terms, contact:",
      },
    ],
  },
];
