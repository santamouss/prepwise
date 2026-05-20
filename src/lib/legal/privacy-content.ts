import type { LegalSection } from "@/components/marketing/legal-types";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    blocks: [
      {
        type: "p",
        text: "When you use ParkerHero (“Parker,” “we,” “us,” or “our”), we may collect information you provide directly, information generated through your use of the service, and limited technical data from your device or browser.",
      },
      {
        type: "ul",
        items: [
          "Account and profile information such as your name, email address, password (stored in hashed form), and preferences you set during onboarding.",
          "Practice and interview session data, including role, company, interview type, duration, and settings you choose before a session.",
          "Voice session content processed in real time, including audio streams used to produce transcripts and coaching feedback.",
          "Transcripts, session summaries, scores, themes, and delivery-related metrics derived from your responses.",
          "Résumé and job description content you paste, upload, or fetch from a job posting URL when you choose to add them.",
          "Usage information such as pages visited, features used, session counts, and approximate timestamps.",
          "Device and log data such as IP address, browser type, operating system, and diagnostic logs used to operate and secure the service.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    blocks: [
      {
        type: "p",
        text: "We use the information we collect to provide, maintain, and improve ParkerHero, including to:",
      },
      {
        type: "ul",
        items: [
          "Authenticate you and manage your account.",
          "Run mock interviews and Coach Mode sessions with Parker.",
          "Generate personalized questions and feedback based on your inputs and session performance.",
          "Enforce plan limits, prevent abuse, and protect the security of our users and systems.",
          "Communicate with you about the service, including support requests and important notices.",
          "Analyze aggregated or de-identified usage to improve product quality and reliability.",
        ],
      },
      {
        type: "p",
        text: "We do not sell your personal information.",
      },
    ],
  },
  {
    id: "voice-interview-data",
    title: "Voice & Interview Data",
    blocks: [
      {
        type: "p",
        text: "ParkerHero is voice-first. During a practice session, your microphone audio may be streamed to our infrastructure and to third-party AI providers that power real-time conversation, speech recognition, and response generation.",
      },
      {
        type: "p",
        text: "For typical candidate practice sessions, we focus on transcripts, timing, and derived delivery metrics rather than long-term storage of raw audio recordings. Configuration, product mode, or future features may change what is stored; we will describe material changes in this policy when they apply broadly.",
      },
      {
        type: "p",
        text: "Interview transcripts and AI-generated reports may be stored in your account so you can review sessions, track progress, and access feedback after a session ends.",
      },
    ],
  },
  {
    id: "resume-job-description",
    title: "Résumé & Job Description Uploads",
    blocks: [
      {
        type: "p",
        text: "If you provide a résumé, paste a job description, or supply a job posting URL, we process that content to tailor interview questions and coaching context. This may include extracting text from PDF or document uploads.",
      },
      {
        type: "p",
        text: "You should not upload content you do not have the right to use. Remove sensitive information you do not want processed by our systems before uploading.",
      },
      {
        type: "p",
        text: "Résumé and job description content is used to personalize your experience. It may be retained while your account is active or as needed to provide the service, subject to our retention practices below.",
      },
    ],
  },
  {
    id: "ai-processing",
    title: "AI Processing",
    blocks: [
      {
        type: "p",
        text: "ParkerHero relies on third-party artificial intelligence and cloud infrastructure providers. Relevant session content—including transcripts, prompts derived from your settings, and contextual uploads—may be transmitted to those providers to generate interviewer dialogue, coaching feedback, summaries, and scores.",
      },
      {
        type: "p",
        text: "AI outputs may be inaccurate or incomplete. They are intended for practice and coaching, not as professional, legal, or hiring advice. Provider terms and data handling may also apply to portions of processing they perform on our behalf.",
      },
    ],
  },
  {
    id: "cookies-analytics",
    title: "Cookies & Analytics",
    blocks: [
      {
        type: "p",
        text: "We use cookies and similar technologies that are necessary to keep you signed in, remember preferences, and protect the service.",
      },
      {
        type: "p",
        text: "We may use analytics tools to understand how the product is used. Where required by law, we will provide additional choices or notices about non-essential cookies or analytics.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    blocks: [
      {
        type: "p",
        text: "We retain personal information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements.",
      },
      {
        type: "p",
        text: "You may request deletion of your account or certain data by contacting us. Some information may remain in backups for a limited period or where we are required to retain it by law.",
      },
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    blocks: [
      {
        type: "p",
        text: "We use service providers for hosting, authentication, databases, storage, voice relay, email, analytics, and payment processing when applicable. These providers process data on our instructions and subject to contractual safeguards appropriate to the nature of the service.",
      },
      {
        type: "p",
        text: "Links to third-party websites or job boards are not controlled by ParkerHero. Their privacy practices govern information you provide to them directly.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    blocks: [
      {
        type: "p",
        text: "We implement administrative, technical, and organizational measures designed to protect personal information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      },
      {
        type: "p",
        text: "If you believe your account has been compromised, contact us promptly at the address below.",
      },
    ],
  },
  {
    id: "user-rights",
    title: "Your Rights & Choices",
    blocks: [
      {
        type: "p",
        text: "Depending on where you live, you may have rights to access, correct, delete, or restrict certain processing of your personal information, or to object to processing and request portability.",
      },
      {
        type: "p",
        text: "To exercise these rights, contact us using the information below. We may need to verify your identity before responding. We will not discriminate against you for exercising privacy rights afforded by applicable law.",
      },
    ],
  },
  {
    id: "children",
    title: "Children’s Privacy",
    blocks: [
      {
        type: "p",
        text: "ParkerHero is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided us personal information, contact us and we will take appropriate steps to delete it.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    blocks: [
      {
        type: "p",
        text: "We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the “Last updated” date. Material changes may be communicated through the service or by email where appropriate.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    blocks: [
      {
        type: "p",
        text: "Questions about this Privacy Policy or our data practices may be sent to:",
      },
    ],
  },
];
